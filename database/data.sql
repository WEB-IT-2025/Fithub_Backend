-- ============================
-- 🚨 1. DROP TABLES IF EXISTS
-- ============================
DROP TABLE IF EXISTS USERS_ITEMS;
DROP TABLE IF EXISTS USERS_PETS;
DROP TABLE IF EXISTS EXERCISE_DATE;
DROP TABLE IF EXISTS EXERCISE;
DROP TABLE IF EXISTS CONTRIBUTIONS;
DROP TABLE IF EXISTS MISSION_CLEARD;
DROP TABLE IF EXISTS GROUP_MEMBER;
DROP TABLE IF EXISTS GROUP_INFO;
DROP TABLE IF EXISTS PURCHASES;
DROP TABLE IF EXISTS PETS;
DROP TABLE IF EXISTS ITEMS;
DROP TABLE IF EXISTS MISSION;
DROP TABLE IF EXISTS THRESHOLD;
DROP TABLE IF EXISTS USERS;

-- ============================
-- 🧱 2. CREATE TABLES (PK → FK順)
-- ============================

CREATE TABLE USERS (
    user_id VARCHAR(64) PRIMARY KEY,
    user_name VARCHAR(128) NOT NULL,
    user_icon VARCHAR(255),
    email VARCHAR(255) UNIQUE,
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

CREATE TABLE ITEMS (
    item_id VARCHAR(64) PRIMARY KEY,
    item_name VARCHAR(50) NOT NULL,
    item_point INT NOT NULL,
    sold_count INT,
    item_image_folder VARCHAR(255) NOT NULL,
    item_create_day TIMESTAMP NOT NULL,
    item_delete_day TIMESTAMP NOT NULL,
    item_details VARCHAR(16) NOT NULL,
    item_category VARCHAR(50) NOT NULL
);

CREATE TABLE PETS (
    item_id VARCHAR(64) PRIMARY KEY, 
    pet_name VARCHAR(20) NOT NULL,
    pet_image_folder VARCHAR(255) NOT NULL,
    pet_type VARCHAR(255) NOT NULL,
    FOREIGN KEY (item_id) REFERENCES ITEMS(item_id) ON DELETE CASCADE 
);

CREATE TABLE PURCHASES (
purchase_id VARCHAR(64) PRIMARY KEY,
user_id VARCHAR(64) NOT NULL,
item_id VARCHAR(64) NOT NULL,
quantity INT NOT NULL DEFAULT 1,
purchase_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
FOREIGN KEY (item_id) REFERENCES ITEMS(item_id) ON DELETE CASCADE
);

CREATE TABLE USERS_PETS (
    user_id VARCHAR(255) NOT NULL,
    item_id VARCHAR(255) NOT NULL, 
    user_main_pet BOOLEAN NOT NULL,
    user_pet_name VARCHAR(20) NOT NULL,
    user_sub_pet BOOLEAN,
    pet_size INT NOT NULL,
    pet_states INT NOT NULL,
    PRIMARY KEY (user_id, item_id),
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES PETS(item_id) ON DELETE CASCADE
);

CREATE TABLE USERS_ITEMS (
    user_id VARCHAR(255) NOT NULL,
    item_id VARCHAR(255) NOT NULL,
    item_count INT NOT NULL,
    category VARCHAR(255) NOT NULL,
    usage_state BOOLEAN,
    PRIMARY KEY (user_id, item_id),
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES ITEMS(item_id) ON DELETE CASCADE
);

CREATE TABLE GROUP_INFO (
    group_id VARCHAR(64) PRIMARY KEY,
    admin_id VARCHAR(255) NOT NULL,
    group_name VARCHAR(20) NOT NULL,
    max_person INT NOT NULL,
    back_image VARCHAR(255) NOT NULL,
    group_public BOOLEAN NOT NULL,
    FOREIGN KEY (admin_id) REFERENCES USERS(user_id) ON DELETE CASCADE
);

CREATE TABLE GROUP_MEMBER (
    group_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES GROUP_INFO(group_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE
);

CREATE TABLE EXERCISE (
    user_id VARCHAR(64) NOT NULL,
    day TIMESTAMP NOT NULL,
    exercise_quantity INT NOT NULL,
    PRIMARY KEY (user_id, day),
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE
);

CREATE TABLE EXERCISE_DATE (
    user_id VARCHAR(64) NOT NULL,
    timestamp DATETIME NOT NULL,
    steps INT NOT NULL,
    PRIMARY KEY (user_id, timestamp),
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE
);

CREATE TABLE CONTRIBUTIONS (
    user_id VARCHAR(255) NOT NULL,
    day TIMESTAMP NOT NULL,
    count VARCHAR(255) NOT NULL,
    PRIMARY KEY (user_id, day),
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE
);

CREATE TABLE MISSION (
    mission_id VARCHAR(64) PRIMARY KEY,
    mission_name VARCHAR(50) NOT NULL,
    mission_content VARCHAR(255) NOT NULL,
    reward_content VARCHAR(255) NOT NULL,
    mission_type VARCHAR(255) NOT NULL,
    mission_category VARCHAR(50) NOT NULL
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
    mission_category VARCHAR(50) NOT NULL,
    PRIMARY KEY (user_id, mission_id),
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    FOREIGN KEY (mission_id) REFERENCES MISSION(mission_id) ON DELETE CASCADE
);

CREATE TABLE THRESHOLD (
    steps_point_settings INT NOT NULL,
    pet_size_logic INT NOT NULL,
    pet_health_logic INT NOT NULL,
    exercise_settings INT NOT NULL
);
-- ============================
-- 📦 3. INSERT SAMPLE DATA FOR TOKEN REFRESH TESTING
-- ============================
-- 
-- 🔄 TOKEN REFRESH TEST SCENARIOS:
-- User 1 (7Mpj4mM...): Token expires in 30 min → Should be refreshed by background job
-- User 2 (9Xyz2nN...): Token expired 1h ago → Needs immediate refresh 
-- User 3 (1Abc3oO...): Fresh token (55 min left) → No refresh needed
-- User 4 (4Def6pP...): Token expires in 5 min → Edge case testing
-- User 5 (5Ghi9qQ...): Token expires tomorrow → No refresh needed
-- 
-- 🧪 TESTING COMMANDS:
-- SELECT user_name, google_token_expires_at, 
--        TIMESTAMPDIFF(MINUTE, NOW(), google_token_expires_at) as minutes_left
-- FROM USERS ORDER BY google_token_expires_at;
-- 
-- ============================

INSERT INTO THRESHOLD VALUES (1, 1, 1, 1);

