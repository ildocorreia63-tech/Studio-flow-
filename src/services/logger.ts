import { supabase, isSupabaseConfigured } from './supabase';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface AuditLogEntry {
  business_id: string;
  user_id?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, any>;
}

export class Logger {
  private static isDev = process.env.NODE_ENV === 'development';

  /**
   * Log info message safely
   */
  static info(message: string, context?: Record<string, any>) {
    if (Logger.isDev) {
      console.log(`[INFO] ${message}`, context || '');
    }
  }

  /**
   * Log warning message safely
   */
  static warn(message: string, context?: Record<string, any>) {
    console.warn(`[WARN] ${message}`, context || '');
  }

  /**
   * Log error message safely without exposing secrets
   */
  static error(message: string, error?: any, context?: Record<string, any>) {
    const sanitizedError = error instanceof Error ? error.message : error;
    console.error(`[ERROR] ${message}`, {
      error: sanitizedError,
      ...context,
    });
  }

  /**
   * Record security/business audit log entry to Supabase audit_logs
   */
  static async auditAsync(entry: AuditLogEntry): Promise<void> {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('audit_logs').insert({
          business_id: entry.business_id,
          user_id: entry.user_id || null,
          action: entry.action,
          entity_type: entry.entity_type || null,
          entity_id: entry.entity_id || null,
          metadata: entry.metadata || {},
        });

        if (error) {
          Logger.warn('Failed to insert audit log to Supabase', { error: error.message });
        }
      } else {
        Logger.info(`[AUDIT DEMO] ${entry.action}`, entry);
      }
    } catch (err) {
      Logger.error('Exception recording audit log', err);
    }
  }
}
