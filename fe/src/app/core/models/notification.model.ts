export type NotificationSeverity = 'error' | 'warning' | 'info';

/** Alert from GET /notifications — computed on the backend, filtered by permissions */
export interface AppNotification {
  /** Stable id: changes when the situation changes (e.g. expiring → expired) */
  id: string;
  severity: NotificationSeverity;
  category: 'vehicle' | 'maintenance' | 'driver' | 'trip' | 'itinerary';
  title: string;
  message: string;
  /** Page to open to deal with it */
  link: string;
  date: string;
}
