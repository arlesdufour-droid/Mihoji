export type SecuritySeverity = 'critical' | 'warning' | 'info';
export type SecurityIssue = { severity: SecuritySeverity; rule: string; file: string; line: number; message: string; fixHint: string };
export type SecurityFiles = Map<string, string>;
