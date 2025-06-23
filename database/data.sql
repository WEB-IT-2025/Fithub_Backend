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
INSERT INTO USERS VALUES
  ('user001', '太郎', '/icons/taro.png', 120, 'access_token_1', 'git001',
   '2025-06-19 09:00:00', '2025-06-20 10:00:00', 'refresh1', 'access1'),
  ('user002', '花子', '/icons/hanako.png', 250, 'access_token_2', 'git002',
   '2025-06-19 09:30:00', '2025-06-20 11:00:00', 'refresh2', 'access2'),
  ('user003', '次郎', '/icons/jiro.png',  80, 'access_token_3', 'git003',
   '2025-06-19 10:00:00', '2025-06-20 12:00:00', 'refresh3', 'access3');

INSERT INTO PETS VALUES
  ('pet001', 'ドラゴン', '/pets/dragon'),
  ('pet002', 'ネコ',     '/pets/cat'),
  ('pet003', 'パンダ',   '/pets/panda');

INSERT INTO ITEM VALUES
  ('item001', 'りんご', 10, 100, '/items/apple',  '2025-06-15 00:00:00', NULL),
  ('item002', 'バナナ', 15,  80, '/items/banana', '2025-06-16 00:00:00', NULL),
  ('item003', 'クッキー',25,  60, '/items/cookie', '2025-06-17 00:00:00', NULL);

INSERT INTO MISSION VALUES
  ('m001', 'デイリー1000歩',    '1日1000歩以上歩く',        '10ポイント', 1),
  ('m002', '週3日運動',        '1週間に3日運動する',        '30ポイント', 0),
  ('m003', '新規ペット獲得',    'ペットを1匹ゲットする',      'ペット餌1個', 1);

INSERT INTO GROUP_INFO VALUES
  ('g001', 'user001', 'ドラゴンの巣', 10, '/groups/g1.jpg'),
  ('g002', 'user002', 'キャットクラブ', 8, '/groups/g2.jpg'),
  ('g003', 'user003', 'パンダパレス', 12, '/groups/g3.jpg');

INSERT INTO THRESHOLD VALUES
  (1, 1, 1, 1, 1);

INSERT INTO USERS_ITEMS VALUES
  ('user001', 'item001', 5, 'red',    1),
  ('user001', 'item002', 2, 'yellow', 0),
  ('user002', 'item001', 1, 'green',  1);

INSERT INTO USERS_PETS VALUES
  ('user001', 'pet001', 1, 'ドラちゃん', 0, 'L'),
  ('user002', 'pet002', 1, 'ミケ',       0, 'M'),
  ('user003', 'pet003', 1, 'パンちゃん', 0, 'S');

INSERT INTO EXERCISE VALUES
  ('user001', '2025-06-19', 1200),
  ('user002', '2025-06-19',  800),
  ('user003', '2025-06-19', 1500);

INSERT INTO CONTRIBUTIONS VALUES
  ('user001', '2025-06-19', 30),
  ('user002', '2025-06-19', 20),
  ('user003', '2025-06-19', 35);

INSERT INTO MISSION_CLEARD VALUES
  ('user001', 'm001', '2025-06-19 21:00:00'),
  ('user002', 'm001', '2025-06-19 22:00:00'),
  ('user003', 'm003', '2025-06-19 23:00:00');

INSERT INTO GROUP_MEMBER VALUES
  ('g001', 'user001', 'ADMIN'),
  ('g001', 'user002', 'MEMBER'),
  ('g002', 'user002', 'ADMIN');
