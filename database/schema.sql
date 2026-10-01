SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS redzone
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE redzone;

CREATE TABLE users (
  user_id       INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(20)  NOT NULL UNIQUE,
  student_code  VARCHAR(20)  UNIQUE,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(150) NOT NULL,
  faculty       VARCHAR(150),
  role          ENUM('user','admin') NOT NULL DEFAULT 'user',
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  ban_reason    VARCHAR(255) NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_settings (
  user_id           INT PRIMARY KEY,
  notify_proximity  TINYINT(1) NOT NULL DEFAULT 1,
  notify_status     TINYINT(1) NOT NULL DEFAULT 1,
  weekly_email      TINYINT(1) NOT NULL DEFAULT 0,
  share_location    TINYINT(1) NOT NULL DEFAULT 1,
  always_anonymous  TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_settings_user FOREIGN KEY (user_id)
    REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categories (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(30)  NOT NULL UNIQUE,
  name_th     VARCHAR(120) NOT NULL,
  name_en     VARCHAR(120) NOT NULL,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE locations (
  location_id   INT AUTO_INCREMENT PRIMARY KEY,
  name_th       VARCHAR(150) NOT NULL,
  name_en       VARCHAR(150),
  building_code VARCHAR(30),
  latitude      DECIMAL(10,7),
  longitude     DECIMAL(10,7)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE zones (
  zone_id       INT AUTO_INCREMENT PRIMARY KEY,
  name_th       VARCHAR(150) NOT NULL,
  name_en       VARCHAR(150),
  risk_level    ENUM('high','mid','low') NOT NULL DEFAULT 'mid',
  center_lat    DECIMAL(10,7),
  center_lng    DECIMAL(10,7),
  radius_m      SMALLINT     NOT NULL DEFAULT 100,
  report_count  INT          NOT NULL DEFAULT 0,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reports (
  report_id     INT AUTO_INCREMENT PRIMARY KEY,
  report_code   VARCHAR(20)  NOT NULL UNIQUE,
  user_id       INT          NULL,
  category_id   INT          NOT NULL,
  category_other VARCHAR(120) NULL,
  location_id   INT          NULL,
  location_name VARCHAR(120) NULL,
  zone_id       INT          NULL,
  severity      ENUM('high','mid','low')            NOT NULL DEFAULT 'mid',

  status        ENUM('sent','ack','prog','done','reject') NOT NULL DEFAULT 'sent',

  is_approved   TINYINT(1)   NOT NULL DEFAULT 0,

  resolved_at   DATETIME     NULL,
  resolve_note  VARCHAR(500) NULL,
  resolve_unit  VARCHAR(120) NULL,
  resolved_by   INT          NULL,

  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  occurred_at   DATETIME     NOT NULL,
  latitude      DECIMAL(10,7),
  longitude     DECIMAL(10,7),
  is_anonymous  TINYINT(1)   NOT NULL DEFAULT 0,
  reject_reason VARCHAR(255) NULL,
  confirm_count INT          NOT NULL DEFAULT 0,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_report_user     FOREIGN KEY (user_id)     REFERENCES users(user_id)      ON DELETE SET NULL,
  CONSTRAINT fk_report_category FOREIGN KEY (category_id) REFERENCES categories(category_id),
  CONSTRAINT fk_report_location FOREIGN KEY (location_id) REFERENCES locations(location_id) ON DELETE SET NULL,
  CONSTRAINT fk_report_zone     FOREIGN KEY (zone_id)     REFERENCES zones(zone_id)       ON DELETE SET NULL,
  INDEX idx_report_status   (status),
  INDEX idx_report_approved (is_approved),
  INDEX idx_report_severity (severity),
  CONSTRAINT fk_report_resolver FOREIGN KEY (resolved_by) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_report_occurred (occurred_at),
  INDEX idx_report_resolved (resolved_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE report_attachments (
  attachment_id INT AUTO_INCREMENT PRIMARY KEY,
  report_id     INT          NOT NULL,
  kind          ENUM('before','after') NOT NULL DEFAULT 'before',
  file_path     VARCHAR(255) NOT NULL,
  file_size     INT,
  mime_type     VARCHAR(60),
  uploaded_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_attach_report FOREIGN KEY (report_id)
    REFERENCES reports(report_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE report_status_logs (
  log_id      INT AUTO_INCREMENT PRIMARY KEY,
  report_id   INT NOT NULL,
  from_status ENUM('sent','ack','prog','done','reject'),
  to_status   ENUM('sent','ack','prog','done','reject') NOT NULL,
  changed_by  INT NULL,
  note        VARCHAR(255),
  changed_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_log_report FOREIGN KEY (report_id)  REFERENCES reports(report_id) ON DELETE CASCADE,
  CONSTRAINT fk_log_user   FOREIGN KEY (changed_by) REFERENCES users(user_id)     ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE report_confirmations (
  report_id  INT NOT NULL,
  user_id    INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (report_id, user_id),
  CONSTRAINT fk_confirm_report FOREIGN KEY (report_id) REFERENCES reports(report_id) ON DELETE CASCADE,
  CONSTRAINT fk_confirm_user   FOREIGN KEY (user_id)   REFERENCES users(user_id)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE comments (
  comment_id  INT AUTO_INCREMENT PRIMARY KEY,
  report_id   INT          NOT NULL,
  user_id     INT          NULL,
  content     VARCHAR(500) NOT NULL,
  is_hidden   TINYINT(1)   NOT NULL DEFAULT 0,
  hidden_by   INT          NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comment_report FOREIGN KEY (report_id) REFERENCES reports(report_id) ON DELETE CASCADE,
  CONSTRAINT fk_comment_user   FOREIGN KEY (user_id)   REFERENCES users(user_id)     ON DELETE SET NULL,
  CONSTRAINT fk_comment_hider  FOREIGN KEY (hidden_by) REFERENCES users(user_id)     ON DELETE SET NULL,
  INDEX idx_comment_report (report_id, is_hidden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT          NOT NULL,
  type            ENUM('status','zone','new','done') NOT NULL,
  title           VARCHAR(200) NOT NULL,
  message         VARCHAR(500),
  ref_report_id   INT          NULL,
  is_read         TINYINT(1)   NOT NULL DEFAULT 0,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notify_user   FOREIGN KEY (user_id)       REFERENCES users(user_id)     ON DELETE CASCADE,
  CONSTRAINT fk_notify_report FOREIGN KEY (ref_report_id) REFERENCES reports(report_id) ON DELETE SET NULL,
  INDEX idx_notify_unread (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE login_attempts (
  attempt_id INT AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(20)  NOT NULL,
  ip_address VARCHAR(45)  NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_attempt_user (username, created_at),
  INDEX idx_attempt_ip   (ip_address, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE admin_audit_logs (
  log_id      INT AUTO_INCREMENT PRIMARY KEY,
  admin_id    INT          NOT NULL,
  action      ENUM('approve_report','reject_report','delete_report',
                   'set_status','resolve_report',
                   'hide_comment','ban_user','unban_user') NOT NULL,
  target_type ENUM('report','comment','user') NOT NULL,
  target_id   VARCHAR(30)  NOT NULL,
  reason      VARCHAR(255),
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id) REFERENCES users(user_id),
  INDEX idx_audit_admin (admin_id, created_at),
  INDEX idx_audit_target (target_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
