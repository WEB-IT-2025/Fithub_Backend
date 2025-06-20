-- DROP TABLES（依存関係に注意してすべて先に削除）
DROP TABLE IF EXISTS USERS_PETS;
DROP TABLE IF EXISTS EXERCIS_CLEARD;
DROP TABLE IF EXISTS EXERCIS_PLUS;
DROP TABLE IF EXISTS MISSION_CLEARD;
DROP TABLE IF EXISTS ACCOUNT;
DROP TABLE IF EXISTS `GROUP`;
DROP TABLE IF EXISTS USERS;
DROP TABLE IF EXISTS PETS;
DROP TABLE IF EXISTS EXERCIS;
DROP TABLE IF EXISTS MISSION;
DROP TABLE IF EXISTS SHOP;
DROP TABLE IF EXISTS STANDARDS;


-- USERS
CREATE TABLE USERS (
  user_id VARCHAR(255) PRIMARY KEY,
  user_name VARCHAR(20) NOT NULL,
  user_icon VARCHAR(255),
  point INT NOT NULL,
  git_access TEXT,
  git_id VARCHAR(255),
  google_access_token TEXT,
  google_refresh_token TEXT
);

-- SHOP
CREATE TABLE SHOP (
  item_id VARCHAR(255) PRIMARY KEY,
  item_name VARCHAR(50) NOT NULL,
  item_point INT NOT NULL,
  sold_count INT NOT NULL,
  item_image_folder VARCHAR(255) NOT NULL,
  item_create_day TIMESTAMP NOT NULL,
  item_delete_day TIMESTAMP
);

-- PETS
CREATE TABLE PETS (
  pet_id VARCHAR(255) PRIMARY KEY,
  pet_name VARCHAR(20) NOT NULL,
  pet_image_folder VARCHAR(255) NOT NULL,
  item_id VARCHAR(255) NOT NULL,
  FOREIGN KEY (item_id) REFERENCES SHOP(item_id)
);

-- EXERCISES
CREATE TABLE EXERCIS (
  exercise_id VARCHAR(255) PRIMARY KEY,
  exercise_name VARCHAR(20) NOT NULL,
  day TIMESTAMP NOT NULL,
  exercise_quantity VARCHAR(255) NOT NULL
);

-- MISSION
CREATE TABLE MISSION (
  mission_id VARCHAR(255) PRIMARY KEY,
  mission_name VARCHAR(50) NOT NULL,
  mission_content VARCHAR(255) NOT NULL,
  reward_content VARCHAR(255) NOT NULL
);



-- STANDARDS
CREATE TABLE STANDARDS (
  steps_point_settings INT NOT NULL,
  pet_size INT NOT NULL,
  pet_health INT NOT NULL,
  exercise_settings INT NOT NULL
);

-- USERS_PETS
CREATE TABLE USERS_PETS (
  user_id VARCHAR(255) NOT NULL,
  pet_id VARCHAR(255) NOT NULL,
  user_main_pet BOOLEAN NOT NULL,
  user_pet_name VARCHAR(20) NOT NULL,
  user_sub_pet BOOLEAN NOT NULL,
  PRIMARY KEY (user_id, pet_id),
  FOREIGN KEY (user_id) REFERENCES USERS(user_id),
  FOREIGN KEY (pet_id) REFERENCES PETS(pet_id)
);

-- EXERCIS_CLEARD
CREATE TABLE EXERCIS_CLEARD (
  exercise_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  day TIMESTAMP NOT NULL,
  final_exercise VARCHAR(255) NOT NULL,
  PRIMARY KEY (exercise_id, user_id),
  FOREIGN KEY (exercise_id) REFERENCES EXERCIS(exercise_id),
  FOREIGN KEY (user_id) REFERENCES USERS(user_id)
);

-- EXERCIS_PLUS
CREATE TABLE EXERCIS_PLUS (
  user_id VARCHAR(255) NOT NULL,
  plus_exercise VARCHAR(255),
  day TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES USERS(user_id)
);

-- MISSION_CLEARD
CREATE TABLE MISSION_CLEARD (
  user_id VARCHAR(255) NOT NULL,
  mission_id VARCHAR(255) NOT NULL,
  day_time TIMESTAMP NOT NULL,
  PRIMARY KEY (user_id, mission_id),
  FOREIGN KEY (user_id) REFERENCES USERS(user_id),
  FOREIGN KEY (mission_id) REFERENCES MISSION(mission_id)
);

-- ACCOUNT
CREATE TABLE ACCOUNT (
  user_id VARCHAR(255) PRIMARY KEY,
  create_account TIMESTAMP NOT NULL,
  last_login TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES USERS(user_id)
);

-- GROUP
CREATE TABLE `GROUP` (
  user_id VARCHAR(255) NOT NULL,
  group_id VARCHAR(255) NOT NULL,
  group_name VARCHAR(20) NOT NULL,
  max_in_person INT NOT NULL,
  back_image VARCHAR(255) NOT NULL,
  PRIMARY KEY (user_id, group_id),
  FOREIGN KEY (user_id) REFERENCES USERS(user_id)
);

-- INSERT DATA (全て下にまとめて)
INSERT INTO USERS VALUES 
('u001', 'Alice', 'icon1.png', 1000, 'full', 'git_alice'),
('u002', 'Bob', 'icon2.png', 800, 'read', 'git_bob'),
('u003', 'Charlie', 'icon3.png', 1200, 'write', 'git_charlie'),
('u004', 'Diana', 'icon4.png', 950, 'read', 'git_diana'),
('u005', 'Eve', 'icon5.png', 500, 'none', 'git_eve');

INSERT INTO SHOP VALUES 
('i001', 'Health Potion', 300, 5, 'shop/items', '2025-06-01 12:00:00', NULL),
('i002', 'Magic Ball', 500, 2, 'shop/items', '2025-06-01 12:30:00', NULL),
('i003', 'Pet Food', 200, 10, 'shop/items', '2025-06-01 13:00:00', NULL),
('i004', 'Energy Drink', 250, 4, 'shop/items', '2025-06-01 14:00:00', NULL),
('i005', 'Toy Bone', 150, 7, 'shop/items', '2025-06-01 15:00:00', NULL);

INSERT INTO PETS VALUES 
('p001', 'Doggo', 'pets/doggo','i001'),
('p002', 'Catty', 'pets/catty','i002'),
('p003', 'Birdo', 'pets/birdo','i003'),
('p004', 'Hammy', 'pets/hammy','i004'),
('p005', 'Lizardy', 'pets/lizardy','i005');

INSERT INTO EXERCIS VALUES 
('e001', 'Jogging', '2025-06-01 08:00:00', '3km'),
('e002', 'Yoga', '2025-06-01 10:00:00', '30min'),
('e003', 'Stretch', '2025-06-01 11:00:00', '15min'),
('e004', 'Pushups', '2025-06-01 12:00:00', '50 reps'),
('e005', 'Walking', '2025-06-01 13:00:00', '1hr');

INSERT INTO MISSION VALUES 
('m001', 'First Steps', 'Walk 500 steps', '50 points'),
('m002', 'Stretch Out', 'Do 10 mins of yoga', 'Pet food'),
('m003', 'Runner', 'Run 3km', '100 points'),
('m004', 'Power Up', 'Complete 50 pushups', 'Muscle badge'),
('m005', 'Explorer', 'Walk for 1 hour', 'Shoes');



INSERT INTO STANDARDS VALUES (1, 1, 1,5000);

INSERT INTO USERS_PETS VALUES 
('u001', 'p001', TRUE, 'Buddy', FALSE),
('u002', 'p002', TRUE, 'Whiskers', TRUE),
('u003', 'p003', TRUE, 'Tweety', FALSE),
('u004', 'p004', TRUE, 'Cheeks', FALSE),
('u005', 'p005', TRUE, 'Draco', TRUE);

INSERT INTO EXERCIS_CLEARD VALUES 
('e001', 'u001', '2025-06-01 09:00:00', '3km'),
('e002', 'u002', '2025-06-01 11:00:00', '30min'),
('e003', 'u003', '2025-06-01 12:00:00', '15min'),
('e004', 'u004', '2025-06-01 13:00:00', '50 reps'),
('e005', 'u005', '2025-06-01 14:00:00', '1hr');

INSERT INTO EXERCIS_PLUS VALUES 
('u001', '1km extra', '2025-06-01 09:30:00'),
('u002', '500m extra', '2025-06-01 11:30:00'),
('u003', '10min extra', '2025-06-01 12:30:00'),
('u004', '20 reps extra', '2025-06-01 13:30:00'),
('u005', '15min extra', '2025-06-01 14:30:00');

INSERT INTO MISSION_CLEARD VALUES 
('u001', 'm001', '2025-06-01 14:00:00'),
('u002', 'm002', '2025-06-01 14:10:00'),
('u003', 'm003', '2025-06-01 14:20:00'),
('u004', 'm004', '2025-06-01 14:30:00'),
('u005', 'm005', '2025-06-01 14:40:00');

INSERT INTO ACCOUNT VALUES 
('u001', '2025-01-01 12:00:00', '2025-06-01 13:00:00'),
('u002', '2025-02-01 09:00:00', '2025-06-01 13:10:00'),
('u003', '2025-03-01 08:00:00', '2025-06-01 13:20:00'),
('u004', '2025-04-01 07:00:00', '2025-06-01 13:30:00'),
('u005', '2025-05-01 06:00:00', '2025-06-01 13:40:00');

INSERT INTO `GROUP` VALUES 
('u001', 'g001', 'TeamFit', 10, 'backgrounds/bg1.jpg'),
('u002', 'g002', 'ZenGroup', 5, 'backgrounds/bg2.jpg'),
('u003', 'g003', 'FastTrack', 8, 'backgrounds/bg3.jpg'),
('u004', 'g004', 'StrongGang', 12, 'backgrounds/bg4.jpg'),
('u005', 'g005', 'Walkers', 6, 'backgrounds/bg5.jpg');
