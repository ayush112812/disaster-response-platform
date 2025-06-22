-- Migration to add real-time data aggregation tables and remove audit trail

-- Remove audit trail tables and triggers
DROP TRIGGER IF EXISTS disasters_audit ON disasters;
DROP TRIGGER IF EXISTS resources_audit ON resources;
DROP FUNCTION IF EXISTS audit_trigger_func();
DROP TABLE IF EXISTS audit_trail;

-- Remove audit trail columns from existing tables
ALTER TABLE disasters DROP COLUMN IF EXISTS audit_trail;
ALTER TABLE resources DROP COLUMN IF EXISTS audit_trail;

-- Create real-time data cache table
CREATE TABLE IF NOT EXISTS real_time_data_cache (
    id VARCHAR(50) PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for real-time data cache
CREATE INDEX IF NOT EXISTS idx_real_time_data_cache_updated_at ON real_time_data_cache(updated_at);

-- Create data aggregation log table for monitoring
CREATE TABLE IF NOT EXISTS data_aggregation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for aggregation log
CREATE INDEX IF NOT EXISTS idx_data_aggregation_log_source ON data_aggregation_log(source);
CREATE INDEX IF NOT EXISTS idx_data_aggregation_log_status ON data_aggregation_log(status);
CREATE INDEX IF NOT EXISTS idx_data_aggregation_log_created_at ON data_aggregation_log(created_at);

-- Create real-time alerts table for high-priority notifications
CREATE TABLE IF NOT EXISTS real_time_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    description TEXT,
    location_name TEXT,
    location GEOGRAPHY(Point, 4326),
    source VARCHAR(100) NOT NULL,
    source_id VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for real-time alerts
CREATE INDEX IF NOT EXISTS idx_real_time_alerts_type ON real_time_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_real_time_alerts_severity ON real_time_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_real_time_alerts_active ON real_time_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_real_time_alerts_location ON real_time_alerts USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_real_time_alerts_created_at ON real_time_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_real_time_alerts_expires_at ON real_time_alerts(expires_at);

-- Create data source configuration table
CREATE TABLE IF NOT EXISTS data_source_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name VARCHAR(100) NOT NULL UNIQUE,
    source_type VARCHAR(50) NOT NULL,
    api_endpoint TEXT,
    api_key_encrypted TEXT,
    update_frequency_seconds INTEGER DEFAULT 300,
    is_enabled BOOLEAN DEFAULT true,
    last_successful_fetch TIMESTAMPTZ,
    last_error TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,
    rate_limit_per_hour INTEGER DEFAULT 1000,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for data source config
CREATE INDEX IF NOT EXISTS idx_data_source_config_enabled ON data_source_config(is_enabled);
CREATE INDEX IF NOT EXISTS idx_data_source_config_type ON data_source_config(source_type);

-- Create data quality metrics table
CREATE TABLE IF NOT EXISTS data_quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name VARCHAR(100) NOT NULL,
    metric_date DATE NOT NULL,
    total_records INTEGER DEFAULT 0,
    valid_records INTEGER DEFAULT 0,
    invalid_records INTEGER DEFAULT 0,
    duplicate_records INTEGER DEFAULT 0,
    quality_score DECIMAL(5,2), -- Percentage 0-100
    avg_processing_time_ms INTEGER,
    error_rate DECIMAL(5,2), -- Percentage 0-100
    uptime_percentage DECIMAL(5,2), -- Percentage 0-100
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for data quality metrics
CREATE INDEX IF NOT EXISTS idx_data_quality_metrics_source ON data_quality_metrics(source_name);
CREATE INDEX IF NOT EXISTS idx_data_quality_metrics_date ON data_quality_metrics(metric_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_data_quality_metrics_unique ON data_quality_metrics(source_name, metric_date);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create update timestamp triggers for new tables
CREATE TRIGGER update_real_time_data_cache_timestamp
BEFORE UPDATE ON real_time_data_cache
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_real_time_alerts_timestamp
BEFORE UPDATE ON real_time_alerts
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_data_source_config_timestamp
BEFORE UPDATE ON data_source_config
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Create function to clean up expired alerts
CREATE OR REPLACE FUNCTION cleanup_expired_alerts()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM real_time_alerts 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    INSERT INTO data_aggregation_log (source, status, records_processed, processing_time_ms)
    VALUES ('cleanup_expired_alerts', 'success', deleted_count, 0);
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate data quality score
CREATE OR REPLACE FUNCTION calculate_quality_score(
    total_records INTEGER,
    valid_records INTEGER,
    duplicate_records INTEGER
) RETURNS DECIMAL(5,2) AS $$
BEGIN
    IF total_records = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN ROUND(
        ((valid_records - duplicate_records)::DECIMAL / total_records::DECIMAL) * 100,
        2
    );
END;
$$ LANGUAGE plpgsql;

-- Insert default data source configurations
INSERT INTO data_source_config (source_name, source_type, api_endpoint, update_frequency_seconds, is_enabled) VALUES
('USGS_Earthquakes', 'earthquake', 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson', 300, true),
('NWS_Weather_Alerts', 'weather', 'https://api.weather.gov/alerts/active', 180, true),
('Social_Media_Monitor', 'social', 'internal://social-media-aggregator', 60, true),
('News_Aggregator', 'news', 'internal://news-aggregator', 600, true)
ON CONFLICT (source_name) DO NOTHING;

-- Create view for active high-priority alerts
CREATE OR REPLACE VIEW active_high_priority_alerts AS
SELECT 
    id,
    alert_type,
    severity,
    title,
    description,
    location_name,
    ST_Y(location::geometry) as latitude,
    ST_X(location::geometry) as longitude,
    source,
    metadata,
    created_at,
    expires_at
FROM real_time_alerts 
WHERE is_active = true 
AND severity IN ('high', 'critical')
AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY 
    CASE severity 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        ELSE 3 
    END,
    created_at DESC;

-- Create view for data source health
CREATE OR REPLACE VIEW data_source_health AS
SELECT 
    dsc.source_name,
    dsc.source_type,
    dsc.is_enabled,
    dsc.last_successful_fetch,
    dsc.last_error,
    dsc.retry_count,
    dsc.max_retries,
    CASE 
        WHEN dsc.last_successful_fetch IS NULL THEN 'never_fetched'
        WHEN dsc.last_successful_fetch < NOW() - INTERVAL '1 hour' THEN 'stale'
        WHEN dsc.retry_count >= dsc.max_retries THEN 'failed'
        WHEN dsc.last_error IS NOT NULL THEN 'degraded'
        ELSE 'healthy'
    END as health_status,
    EXTRACT(EPOCH FROM (NOW() - dsc.last_successful_fetch))/60 as minutes_since_last_fetch
FROM data_source_config dsc
ORDER BY 
    CASE 
        WHEN dsc.last_successful_fetch IS NULL THEN 1
        WHEN dsc.retry_count >= dsc.max_retries THEN 2
        WHEN dsc.last_error IS NOT NULL THEN 3
        ELSE 4
    END,
    dsc.source_name;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;
