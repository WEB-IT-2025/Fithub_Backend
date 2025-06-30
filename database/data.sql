-- ============================
-- 🚨 1. DROP TABLES IF EXISTS
-- ============================
DROP TABLE IF EXISTS USERS_ITEMS;
DROP TABLE IF EXISTS USERS_PETS;
DROP TABLE IF EXISTS EXERCISE;
DROP TABLE IF EXISTS CONTRIBUTIONS;
DROP TABLE IF EXISTS MISSION_CLEARD;
DROP TABLE IF EXISTS MISSION;
DROP TABLE IF EXISTS ITEMS;
DROP TABLE IF EXISTS GROUP_MEMBER;
DROP TABLE IF EXISTS GROUP_INFO;
DROP TABLE IF EXISTS PETS;
DROP TABLE IF EXISTS THRESHOLD;
DROP TABLE IF EXISTS USERS;

-- ============================
-- 🧱 2. CREATE TABLES (PK → FK順)
-- ============================

CREATE TABLE USERS (
    user_id VARCHAR(255) PRIMARY KEY,
    user_name VARCHAR(20) NOT NULL,
    user_icon VARCHAR(255),
    point INT NOT NULL,
    google_access_token TEXT NOT NULL,
    google_refresh_token TEXT NOT NULL,
    google_token_expires_at TIMESTAMP NOT NULL,
    github_access_token TEXT NOT NULL,
    github_refresh_token TEXT NOT NULL,
    github_token_expires_at TIMESTAMP,
    github_user_id VARCHAR(255) NOT NULL,
    github_username VARCHAR(255) NOT NULL
);

CREATE TABLE PETS (
    pet_id VARCHAR(255) PRIMARY KEY,
    pet_name VARCHAR(20) NOT NULL,
    pet_image_folder VARCHAR(255) NOT NULL
);

CREATE TABLE ITEMS (
    item_id VARCHAR(255) PRIMARY KEY,
    item_name VARCHAR(50) NOT NULL,
    item_point INT NOT NULL,
    sold_count INT NOT NULL,
    item_image_folder VARCHAR(255) NOT NULL,
    item_create_day TIMESTAMP NOT NULL,
    item_delete_day TIMESTAMP NOT NULL
);

CREATE TABLE THRESHOLD (
    steps_point_settings INT NOT NULL,
    pet_size_logic INT NOT NULL,
    pet_health_logic INT NOT NULL,
    exercise_settings INT NOT NULL
);

CREATE TABLE GROUP_INFO (
    group_id VARCHAR(255) PRIMARY KEY,
    admin_id VARCHAR(255) NOT NULL,
    group_name VARCHAR(20) NOT NULL,
    max_person INT NOT NULL,
    back_image VARCHAR(255) NOT NULL,
    FOREIGN KEY (admin_id) REFERENCES USERS(user_id)
);

CREATE TABLE GROUP_MEMBER (
    group_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES GROUP_INFO(group_id),
    FOREIGN KEY (user_id) REFERENCES USERS(user_id)
);

CREATE TABLE EXERCISE (
    user_id VARCHAR(20) NOT NULL,
    day TIMESTAMP NOT NULL,
    exercise_quantity INT NOT NULL,
    PRIMARY KEY (user_id, day),
    FOREIGN KEY (user_id) REFERENCES USERS(user_id)
);

CREATE TABLE CONTRIBUTIONS (
    user_id VARCHAR(255) NOT NULL,
    day TIMESTAMP NOT NULL,
    count VARCHAR(255) NOT NULL,
    PRIMARY KEY (user_id, day),
    FOREIGN KEY (user_id) REFERENCES USERS(user_id)
);

CREATE TABLE MISSION (
    mission_id VARCHAR(255) PRIMARY KEY,
    mission_name VARCHAR(50) NOT NULL,
    mission_goal VARCHAR(255) NOT NULL,
    reward_content VARCHAR(255) NOT NULL,
    mission_type VARCHAR(255) NOT NULL
);

CREATE TABLE MISSION_CLEARD (
    user_id VARCHAR(255) NOT NULL,
    mission_id VARCHAR(255) NOT NULL,
    mission_goal INT NOT NULL,
    current_status INT,
    clear_status BOOLEAN NOT NULL,
    clear_time TIMESTAMP,
    reward_content INT NOT NULL,
    mission_type VARCHAR(255) NOT NULL,
    PRIMARY KEY (user_id, mission_id),
    FOREIGN KEY (user_id) REFERENCES USERS(user_id),
    FOREIGN KEY (mission_id) REFERENCES MISSION(mission_id)
);

CREATE TABLE USERS_PETS (
    user_id VARCHAR(255) NOT NULL,
    pet_id VARCHAR(255) NOT NULL,
    user_main_pet BOOLEAN NOT NULL,
    user_pet_name VARCHAR(20) NOT NULL,
    user_sub_pet BOOLEAN,
    pet_size VARCHAR(10),
    PRIMARY KEY (user_id, pet_id),
    FOREIGN KEY (user_id) REFERENCES USERS(user_id),
    FOREIGN KEY (pet_id) REFERENCES PETS(pet_id)
);

CREATE TABLE USERS_ITEMS (
    user_id VARCHAR(255) NOT NULL,
    item_id VARCHAR(255) NOT NULL,
    item_count INT NOT NULL,
    category VARCHAR(255) NOT NULL,
    usage_state BOOLEAN,
    PRIMARY KEY (user_id, item_id),
    FOREIGN KEY (user_id) REFERENCES USERS(user_id),
    FOREIGN KEY (item_id) REFERENCES ITEMS(item_id)
);
-- ============================
-- 📦 3. INSERT SAMPLE DATA
-- ============================

INSERT INTO THRESHOLD VALUES (1, 1, 1, 1);

-- USERS
INSERT INTO USERS VALUES
('u1', 'Alice', 'icon1.png', 100, 'g_token1', 'g_refresh1', '2025-06-23 07:02:06', 'gh_token1', 'gh_refresh1', '2025-06-23 07:02:06', 'gh_id1', 'gh_user1'),
('u2', 'Bob', 'icon2.png', 200, 'g_token2', 'g_refresh2', '2025-06-23 07:02:06', 'gh_token2', 'gh_refresh2', '2025-06-23 07:02:06', 'gh_id2', 'gh_user2'),
('u3', 'Carol', 'icon3.png', 300, 'g_token3', 'g_refresh3', '2025-06-23 07:02:06', 'gh_token3', 'gh_refresh3', '2025-06-23 07:02:06', 'gh_id3', 'gh_user3');

-- PETS
INSERT INTO PETS VALUES
('p1', 'Dog', 'folder1'),
('p2', 'Cat', 'folder2'),
('p3', 'Rabbit', 'folder3');

-- ITEMS
INSERT INTO ITEMS VALUES
('i1', 'Ball', 10, 100, 'folder1', '2025-06-23 07:02:06', '2025-06-23 07:02:06'),
('i2', 'Bone', 15, 50, 'folder2', '2025-06-23 07:02:06', '2025-06-23 07:02:06'),
('i3', 'Bell', 20, 80, 'folder3', '2025-06-23 07:02:06', '2025-06-23 07:02:06');

-- GROUP_INFO
INSERT INTO GROUP_INFO VALUES
('g1', 'u1', 'Group A', 10, 'bg1.jpg'),
('g2', 'u2', 'Group B', 8, 'bg2.jpg'),
('g3', 'u3', 'Group C', 5, 'bg3.jpg');

-- GROUP_MEMBER
INSERT INTO GROUP_MEMBER VALUES
('g1', 'u1'),
('g1', 'u2'),
('g2', 'u2'),
('g2', 'u3'),
('g3', 'u3'),
('g3', 'u1');

-- EXERCISE（旧：exercis）
INSERT INTO EXERCISE VALUES
('u1', '2025-06-21 00:00:00', 5000),
('u2', '2025-06-21 00:00:00', 8000),
('u3', '2025-06-21 00:00:00', 12000);

-- CONTRIBUTIONS
INSERT INTO CONTRIBUTIONS VALUES
('u1', '2025-06-21 00:00:00', '3'),
('u2', '2025-06-21 00:00:00', '4'),
('u3', '2025-06-21 00:00:00', '6');

-- MISSION
INSERT INTO MISSION VALUES
('m1', 'Daily Walk', 'Walk 5000 steps', '10pt', 'daily'),
('m2', 'Weekly Goal', 'Walk 30000 steps', '50pt', 'weekly'),
('m3', 'Stretch', 'Stretch 10 min', '5pt', 'daily');

-- MISSION_CLEARD
INSERT INTO MISSION_CLEARD VALUES
('u1', 'm1', 5000, 5000, TRUE, '2025-06-21 12:00:00', 10, 'daily'),
('u2', 'm2', 30000, 25000, FALSE, NULL, 50, 'weekly'),
('u3', 'm3', 10, 10, TRUE, '2025-06-21 08:00:00', 5, 'daily');

-- USERS_PETS
INSERT INTO USERS_PETS VALUES
('u1', 'p1', TRUE, 'Buddy', FALSE, 'M'),
('u2', 'p2', TRUE, 'Mimi', TRUE, 'S'),
('u3', 'p3', FALSE, 'Fluffy', TRUE, 'L');

-- USERS_ITEMS
INSERT INTO USERS_ITEMS VALUES
('u1', 'i1', 2, 'toy', TRUE),
('u2', 'i2', 1, 'food', FALSE),
('u3', 'i3', 3, 'toy', TRUE);