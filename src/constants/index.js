/**
 * Application-wide constants and configurations
 */

export const APP_CONFIG = {
  NAME: 'KAIRO',
  TAGLINE: 'SMAgen Workspace',
  DEFAULT_MODEL: 'KAIRO 4o',
  DISCLAIMER: 'KAIRO is AI and can make mistakes. Please double-check responses.',
}

export const STORAGE_KEYS = {
  TOKEN: 'omni_token',
  USER: 'omni_user',
  ROLE: 'omni_role',
  CHATS: 'kairo_chats',
}

export const ROLES = {
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
  DEVELOPER: 'DEVELOPER',
  VIEWER: 'VIEWER',
}

export const PRIVILEGED_ROLES = [ROLES.ADMIN, ROLES.OPERATOR]

export const RUN_STATUS = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  AWAITING_APPROVAL: 'AWAITING_APPROVAL',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  PAUSED: 'PAUSED',
}

export const ACTIVE_RUN_STATUSES = [
  RUN_STATUS.PENDING,
  RUN_STATUS.RUNNING,
  RUN_STATUS.AWAITING_APPROVAL,
  RUN_STATUS.PAUSED,
]
