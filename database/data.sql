/* =========================== */
/* 0. 事前処理                 */
/* =========================== */
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS GROUP_MEMBER;
DROP TABLE IF EXISTS MISSION_CLEARD;
DROP TABLE IF EXISTS CONTRIBUTIONS;
DROP TABLE IF EXISTS EXERCISE;
DROP TABLE IF EXISTS USERS_PETS;
DROP TABLE IF EXISTS USERS_ITEMS;
DROP TABLE IF EXISTS GROUP_INFO;
DROP TABLE IF EXISTS MISSION;
DROP TABLE IF EXISTS ITEM;
DROP TABLE IF EXISTS PETS;
DROP TABLE IF EXISTS THRESHOLD;
DROP TABLE IF EXISTS USERS;

SET FOREIGN_KEY_CHECKS = 1;

/* =========================== */
/* 1. 親テーブル               */
/* =========================== */
CREATE TABLE USERS (
  user_id VARCHAR(255) PRIMARY KEY,
  user_name VARCHAR(20) NOT NULL,
  user_icon VARCHAR(255),
  point INT NOT NULL,
  git_access TEXT,
  git_id VARCHAR(255),
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expires_at DATETIME,
  github_refresh_token TEXT,
  github_token_expires_at DATETIME,
  github_username VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE PETS (
  pet_id           VARCHAR(255) PRIMARY KEY,
  pet_name         VARCHAR(20)  NOT NULL,
  pet_image_folder VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE ITEM (
  item_id            VARCHAR(255) PRIMARY KEY,
  item_name          VARCHAR(50)  NOT NULL,
  item_point         INT          NOT NULL,
  sold_count         INT          NOT NULL,
  item_image_folder  VARCHAR(255) NOT NULL,
  item_create_day    TIMESTAMP    NOT NULL,
  item_delete_day    TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE MISSION (
  mission_id      VARCHAR(255) PRIMARY KEY,
  mission_name    VARCHAR(50)  NOT NULL,
  mission_content VARCHAR(255) NOT NULL,
  reward_content  VARCHAR(255) NOT NULL,
  mission_type    BOOLEAN
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE THRESHOLD (
  id                   INT PRIMARY KEY,
  steps_point_settings INT NOT NULL,
  pet_size_logic       INT NOT NULL,
  pet_health_logic     INT NOT NULL,
  exercise_settings    INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE GROUP_INFO (
  group_id      VARCHAR(255) PRIMARY KEY,
  admin_id      VARCHAR(255) NOT NULL,
  group_name    VARCHAR(20)  NOT NULL,
  max_in_person INT          NOT NULL,
  back_image    VARCHAR(255) NOT NULL,
  CONSTRAINT fk_group_admin FOREIGN KEY (admin_id) REFERENCES USERS(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* =========================== */
/* 2. 子テーブル               */
/* =========================== */
CREATE TABLE USERS_ITEMS (
  user_id     VARCHAR(255) NOT NULL,
  item_id     VARCHAR(255) NOT NULL,
  item_count  INT          NOT NULL,
  skin        VARCHAR(50),
  usage_state BOOLEAN      DEFAULT 0,
  PRIMARY KEY (user_id, item_id),
  FOREIGN KEY (user_id) REFERENCES USERS(user_id),
  FOREIGN KEY (item_id) REFERENCES ITEM(item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE USERS_PETS (
  user_id        VARCHAR(255) NOT NULL,
  pet_id         VARCHAR(255) NOT NULL,
  user_main_pet  BOOLEAN      NOT NULL,
  user_pet_name  VARCHAR(20)  NOT NULL,
  user_sub_pet   BOOLEAN,
  pet_size       VARCHAR(10),
  PRIMARY KEY (user_id, pet_id),
  FOREIGN KEY (user_id) REFERENCES USERS(user_id),
  FOREIGN KEY (pet_id)  REFERENCES PETS(pet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE EXERCISE (
  user_id            VARCHAR(255) NOT NULL,
  day                DATE         NOT NULL,
  exercise_quantity  INT          NOT NULL,
  PRIMARY KEY (user_id, day),
  FOREIGN KEY (user_id) REFERENCES USERS(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE CONTRIBUTIONS (
  user_id VARCHAR(255) NOT NULL,
  day     DATE         NOT NULL,
  count   INT          NOT NULL,
  PRIMARY KEY (user_id, day),
  FOREIGN KEY (user_id) REFERENCES USERS(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE MISSION_CLEARD (
  user_id    VARCHAR(255) NOT NULL,
  mission_id VARCHAR(255) NOT NULL,
  day_time   TIMESTAMP    NOT NULL,
  PRIMARY KEY (user_id, mission_id, day_time),
  FOREIGN KEY (user_id)    REFERENCES USERS(user_id),
  FOREIGN KEY (mission_id) REFERENCES MISSION(mission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE GROUP_MEMBER (
  group_id VARCHAR(255) NOT NULL,
  user_id  VARCHAR(255) NOT NULL,
  role     ENUM('ADMIN','MEMBER') DEFAULT 'MEMBER',
  PRIMARY KEY (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES GROUP_INFO(group_id),
  FOREIGN KEY (user_id)  REFERENCES USERS(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* =========================== */
/* 3. サンプルデータ挿入       */
/* =========================== */

-- Insert Users data (matching all 12 columns)
INSERT INTO USERS (user_id, user_name, user_icon, point, git_access, git_id, google_access_token, google_refresh_token, google_token_expires_at, github_refresh_token, github_token_expires_at, github_username) VALUES
  ('user001', 'Taro Yamada', '/icons/taro.png', 120, 'github_access_token_1', 'git001', 'google_access_1', 'google_refresh_1', '2025-12-31 23:59:59', 'github_refresh_1', '2025-12-31 23:59:59', 'tarodev'),
  ('user002', 'Hanako Sato', '/icons/hanako.png', 250, 'github_access_token_2', 'git002', 'google_access_2', 'google_refresh_2', '2025-12-31 23:59:59', 'github_refresh_2', '2025-12-31 23:59:59', 'hanakocode'),
  ('user003', 'Jiro Tanaka', '/icons/jiro.png', 80, 'github_access_token_3', 'git003', 'google_access_3', 'google_refresh_3', '2025-12-31 23:59:59', 'github_refresh_3', '2025-12-31 23:59:59', 'jiroprog'),
  ('user004', 'Michiko Ito', '/icons/michiko.png', 180, 'github_access_token_4', 'git004', 'google_access_4', 'google_refresh_4', '2025-12-31 23:59:59', 'github_refresh_4', '2025-12-31 23:59:59', 'michikodev'),
  ('user005', 'Kenji Suzuki', '/icons/kenji.png', 320, 'github_access_token_5', 'git005', 'google_access_5', 'google_refresh_5', '2025-12-31 23:59:59', 'github_refresh_5', '2025-12-31 23:59:59', 'kenjicoder');

-- Insert Pets data
INSERT INTO PETS (pet_id, pet_name, pet_image_folder) VALUES
  ('pet001', 'Dragon', '/pets/dragon'),
  ('pet002', 'Cat', '/pets/cat'),
  ('pet003', 'Panda', '/pets/panda'),
  ('pet004', 'Rabbit', '/pets/rabbit'),
  ('pet005', 'Wolf', '/pets/wolf');

-- Insert Items data
INSERT INTO ITEM (item_id, item_name, item_point, sold_count, item_image_folder, item_create_day, item_delete_day) VALUES
  ('item001', 'Apple', 10, 100, '/items/apple', '2025-06-15 00:00:00', NULL),
  ('item002', 'Banana', 15, 80, '/items/banana', '2025-06-16 00:00:00', NULL),
  ('item003', 'Cookie', 25, 60, '/items/cookie', '2025-06-17 00:00:00', NULL),
  ('item004', 'Energy Drink', 50, 30, '/items/energy_drink', '2025-06-18 00:00:00', NULL),
  ('item005', 'Protein Bar', 35, 45, '/items/protein_bar', '2025-06-19 00:00:00', NULL);

-- Insert Mission data
INSERT INTO MISSION (mission_id, mission_name, mission_content, reward_content, mission_type) VALUES
  ('m001', 'Daily 1000 Steps', 'Walk at least 1000 steps per day', '10 Points', 1),
  ('m002', 'Weekly 3 Workouts', 'Exercise 3 times in a week', '30 Points', 0),
  ('m003', 'Get New Pet', 'Acquire a new pet', '1 Pet Food', 1),
  ('m004', 'Daily Commit', 'Make at least 1 GitHub commit per day', '15 Points', 1),
  ('m005', 'Weekly Code Review', 'Review code 5 times in a week', '50 Points', 0);

-- Insert Group Info data
INSERT INTO GROUP_INFO (group_id, admin_id, group_name, max_in_person, back_image) VALUES
  ('g001', 'user001', 'Dragon Nest', 10, '/groups/dragon_nest.jpg'),
  ('g002', 'user002', 'Cat Club', 8, '/groups/cat_club.jpg'),
  ('g003', 'user003', 'Panda Palace', 12, '/groups/panda_palace.jpg'),
  ('g004', 'user004', 'Rabbit Run', 15, '/groups/rabbit_run.jpg');

-- Insert Threshold data
INSERT INTO THRESHOLD (id, steps_point_settings, pet_size_logic, pet_health_logic, exercise_settings) VALUES
  (1, 100, 50, 75, 25);

-- Insert Users Items data
INSERT INTO USERS_ITEMS (user_id, item_id, item_count, skin, usage_state) VALUES
  ('user001', 'item001', 5, 'red', 1),
  ('user001', 'item002', 2, 'yellow', 0),
  ('user001', 'item003', 1, 'brown', 0),
  ('user002', 'item001', 3, 'green', 1),
  ('user002', 'item004', 1, 'blue', 1),
  ('user003', 'item002', 4, 'yellow', 0),
  ('user003', 'item005', 2, 'orange', 1),
  ('user004', 'item001', 6, 'red', 0),
  ('user004', 'item003', 3, 'brown', 1),
  ('user005', 'item004', 2, 'blue', 1);

-- Insert Users Pets data
INSERT INTO USERS_PETS (user_id, pet_id, user_main_pet, user_pet_name, user_sub_pet, pet_size) VALUES
  ('user001', 'pet001', 1, 'Draco', 0, 'L'),
  ('user001', 'pet002', 0, 'Whiskers', 1, 'S'),
  ('user002', 'pet002', 1, 'Mike', 0, 'M'),
  ('user002', 'pet003', 0, 'Bamboo', 1, 'M'),
  ('user003', 'pet003', 1, 'Pan-chan', 0, 'S'),
  ('user004', 'pet004', 1, 'Fluffy', 0, 'S'),
  ('user004', 'pet001', 0, 'Drake', 1, 'L'),
  ('user005', 'pet005', 1, 'Alpha', 0, 'L');

-- Insert Exercise data
INSERT INTO EXERCISE (user_id, day, exercise_quantity) VALUES
  ('user001', '2025-06-20', 1200),
  ('user001', '2025-06-21', 1500),
  ('user001', '2025-06-22', 800),
  ('user002', '2025-06-20', 2000),
  ('user002', '2025-06-21', 1800),
  ('user002', '2025-06-22', 2200),
  ('user003', '2025-06-20', 900),
  ('user003', '2025-06-21', 1100),
  ('user003', '2025-06-22', 1300),
  ('user004', '2025-06-20', 1600),
  ('user004', '2025-06-21', 1400),
  ('user005', '2025-06-20', 2500),
  ('user005', '2025-06-21', 2800);

-- Insert Contributions data
INSERT INTO CONTRIBUTIONS (user_id, day, count) VALUES
  ('user001', '2025-06-20', 5),
  ('user001', '2025-06-21', 8),
  ('user001', '2025-06-22', 3),
  ('user002', '2025-06-20', 12),
  ('user002', '2025-06-21', 15),
  ('user002', '2025-06-22', 10),
  ('user003', '2025-06-20', 2),
  ('user003', '2025-06-21', 4),
  ('user003', '2025-06-22', 6),
  ('user004', '2025-06-20', 18),
  ('user004', '2025-06-21', 20),
  ('user004', '2025-06-22', 14),
  ('user005', '2025-06-20', 25),
  ('user005', '2025-06-21', 30),
  ('user005', '2025-06-22', 28);

-- Insert Mission Cleared data
INSERT INTO MISSION_CLEARD (user_id, mission_id, day_time) VALUES
  ('user001', 'm001', '2025-06-20 09:30:00'),
  ('user001', 'm004', '2025-06-20 14:15:00'),
  ('user002', 'm001', '2025-06-20 08:45:00'),
  ('user002', 'm002', '2025-06-21 19:20:00'),
  ('user002', 'm004', '2025-06-20 16:30:00'),
  ('user003', 'm003', '2025-06-20 11:00:00'),
  ('user004', 'm001', '2025-06-20 07:20:00'),
  ('user004', 'm004', '2025-06-20 10:45:00'),
  ('user004', 'm005', '2025-06-22 18:30:00'),
  ('user005', 'm001', '2025-06-20 06:15:00'),
  ('user005', 'm002', '2025-06-21 20:00:00'),
  ('user005', 'm004', '2025-06-20 12:30:00'),
  ('user005', 'm005', '2025-06-22 17:45:00');

-- Insert Group Member data
INSERT INTO GROUP_MEMBER (group_id, user_id, role) VALUES
  ('g001', 'user001', 'ADMIN'),
  ('g001', 'user002', 'MEMBER'),
  ('g001', 'user005', 'MEMBER'),
  ('g002', 'user002', 'ADMIN'),
  ('g002', 'user003', 'MEMBER'),
  ('g002', 'user004', 'MEMBER'),
  ('g003', 'user003', 'ADMIN'),
  ('g003', 'user001', 'MEMBER'),
  ('g004', 'user004', 'ADMIN'),
  ('g004', 'user005', 'MEMBER');
