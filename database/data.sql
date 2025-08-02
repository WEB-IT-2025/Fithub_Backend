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
-- 
-- 🔄 ON DELETE CASCADE:
-- All foreign keys referencing USERS have ON DELETE CASCADE
-- This means when a user is deleted, all related data will be automatically deleted:
-- - EXERCISE records
-- - CONTRIBUTIONS records  
-- - GROUP_MEMBER entries
-- - MISSION_CLEARD progress
-- - USERS_PETS assignments
-- - USERS_ITEMS inventory
-- - GROUP_INFO (if user is admin)
-- 
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

CREATE TABLE PETS (
    pet_id VARCHAR(64) PRIMARY KEY,
    pet_name VARCHAR(20) NOT NULL,
    pet_image_folder VARCHAR(255) NOT NULL
);

CREATE TABLE ITEMS (
    item_id VARCHAR(64) PRIMARY KEY,
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
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    FOREIGN KEY (mission_id) REFERENCES MISSION(mission_id) ON DELETE CASCADE
);

CREATE TABLE USERS_PETS (
    user_id VARCHAR(255) NOT NULL,
    pet_id VARCHAR(255) NOT NULL,
    user_main_pet BOOLEAN NOT NULL,
    user_pet_name VARCHAR(20) NOT NULL,
    user_sub_pet BOOLEAN,
    pet_size INT NOT NULL,
    pet_states INT NOT NULL,
    PRIMARY KEY (user_id, pet_id),
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    FOREIGN KEY (pet_id) REFERENCES PETS(pet_id) ON DELETE CASCADE
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

-- USERS - Realistic test data for token refresh scenarios
INSERT INTO USERS VALUES
-- User 1: Token expires in 30 minutes (needs refresh soon)
('test_user_001_abc123def456ghi789', 
 'TEST USER ONE', 
 'https://lh3.googleusercontent.com/a/default-test-user-1', 
 1500,
 'ya29.a0AWY7CknVGc8FakeTokenExample1234567890abcdef',
 'refresh_token_1_realistic_example_abcd1234567890',
 DATE_ADD(NOW(), INTERVAL 30 MINUTE),
 'gho_GitHubPersonalAccessToken123456789abcdef',
 '',
 NULL,
 '123456789',
 'test-user-one'),

-- User 2: Token expired 1 hour ago (needs immediate refresh)
('9Xyz2nNJpQcyRT8m2KHdxZpwUv23', 
 'TANAKA TARO', 
 'https://lh3.googleusercontent.com/a/default-user-2', 
 2300,
 'ya29.a0AWY7CknVExpiredTokenExample9876543210fedcba',
 'refresh_token_2_realistic_example_efgh9876543210',
 DATE_SUB(NOW(), INTERVAL 1 HOUR),
 'gho_GitHubPersonalAccessToken987654321fedcba',
 '',
 NULL,
 '987654321',
 'tanaka-taro'),

-- User 3: Fresh token (expires in 55 minutes, no refresh needed)
('1Abc3oOKqRezSU9n3LIfaYqxTw34', 
 'SMITH JOHN', 
 'https://lh3.googleusercontent.com/a/default-user-3', 
 890,
 'ya29.a0AWY7CknVFreshTokenExample1111222233334444',
 'refresh_token_3_realistic_example_ijkl1111222233',
 DATE_ADD(NOW(), INTERVAL 55 MINUTE),
 'gho_GitHubPersonalAccessToken111122223333',
 '',
 NULL,
 '111222333',
 'smith-john'),

-- User 4: Token expires in 5 minutes (edge case testing)
('4Def6pPLrSfaTW0o4MJgbZryUx45', 
 'YAMADA HANAKO', 
 'https://lh3.googleusercontent.com/a/default-user-4', 
 750,
 'ya29.a0AWY7CknVEdgeCaseTokenExample555566667777',
 'refresh_token_4_realistic_example_mnop5555666677',
 DATE_ADD(NOW(), INTERVAL 5 MINUTE),
 'gho_GitHubPersonalAccessToken555566667777',
 '',
 NULL,
 '555666777',
 'yamada-hanako'),

-- User 5: Token expires tomorrow (no refresh needed)
('5Ghi9qQMsSgbUX1p5NKhcAsyVy56', 
 'WILSON ALICE', 
 'https://lh3.googleusercontent.com/a/default-user-5', 
 3200,
 'ya29.a0AWY7CknVLongValidTokenExample8888999900001111',
 'refresh_token_5_realistic_example_qrst8888999900',
 DATE_ADD(NOW(), INTERVAL 1 DAY),
 'gho_GitHubPersonalAccessToken888899990000',
 '',
 NULL,
 '888999000',
 'wilson-alice');

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
('g1', 'test_user_001_abc123def456ghi789', 'Fitness Buddies', 10, 'bg1.jpg'),
('g2', '9Xyz2nNJpQcyRT8m2KHdxZpwUv23', 'Morning Runners', 8, 'bg2.jpg'),
('g3', '1Abc3oOKqRezSU9n3LIfaYqxTw34', 'Yoga Masters', 5, 'bg3.jpg');

-- GROUP_MEMBER
INSERT INTO GROUP_MEMBER VALUES
('g1', 'test_user_001_abc123def456ghi789'),
('g1', '9Xyz2nNJpQcyRT8m2KHdxZpwUv23'),
('g2', '9Xyz2nNJpQcyRT8m2KHdxZpwUv23'),
('g2', '1Abc3oOKqRezSU9n3LIfaYqxTw34'),
('g3', '1Abc3oOKqRezSU9n3LIfaYqxTw34'),
('g3', '4Def6pPLrSfaTW0o4MJgbZryUx45');

-- EXERCISE - Sample fitness data for testing
INSERT INTO EXERCISE VALUES
('test_user_001_abc123def456ghi789', '2025-07-03 00:00:00', 8500),
('9Xyz2nNJpQcyRT8m2KHdxZpwUv23', '2025-07-03 00:00:00', 12000),
('1Abc3oOKqRezSU9n3LIfaYqxTw34', '2025-07-03 00:00:00', 6500),
('4Def6pPLrSfaTW0o4MJgbZryUx45', '2025-07-03 00:00:00', 9200),
('test_user_001_abc123def456ghi789', '2025-07-02 00:00:00', 7800),
('9Xyz2nNJpQcyRT8m2KHdxZpwUv23', '2025-07-02 00:00:00', 11500);

-- CONTRIBUTIONS - GitHub contribution data
INSERT INTO CONTRIBUTIONS VALUES
('test_user_001_abc123def456ghi789', '2025-07-03 00:00:00', '5'),
('9Xyz2nNJpQcyRT8m2KHdxZpwUv23', '2025-07-03 00:00:00', '3'),
('1Abc3oOKqRezSU9n3LIfaYqxTw34', '2025-07-03 00:00:00', '8'),
('4Def6pPLrSfaTW0o4MJgbZryUx45', '2025-07-03 00:00:00', '2'),
('test_user_001_abc123def456ghi789', '2025-07-02 00:00:00', '4'),
('9Xyz2nNJpQcyRT8m2KHdxZpwUv23', '2025-07-02 00:00:00', '6');

-- MISSION - Fitness and coding challenges
INSERT INTO MISSION VALUES
('m1', 'Daily Walk', 'Walk 8000 steps', '15pt', 'daily'),
('m2', 'Weekly Goal', 'Walk 50000 steps', '100pt', 'weekly'),
('m3', 'Coding Streak', 'Code for 7 days', '50pt', 'weekly'),
('m4', 'Morning Exercise', 'Exercise for 30 min', '20pt', 'daily'),
('m5', 'GitHub Contribution', 'Make 5 commits', '25pt', 'daily');

-- MISSION_CLEARD - Mission progress for users
INSERT INTO MISSION_CLEARD VALUES
('test_user_001_abc123def456ghi789', 'm1', 8000, 8500, TRUE, '2025-07-03 12:00:00', 15, 'daily'),
('9Xyz2nNJpQcyRT8m2KHdxZpwUv23', 'm2', 50000, 35000, FALSE, NULL, 100, 'weekly'),
('1Abc3oOKqRezSU9n3LIfaYqxTw34', 'm3', 7, 5, FALSE, NULL, 50, 'weekly'),
('4Def6pPLrSfaTW0o4MJgbZryUx45', 'm4', 30, 30, TRUE, '2025-07-03 08:30:00', 20, 'daily'),
('test_user_001_abc123def456ghi789', 'm5', 5, 5, TRUE, '2025-07-03 18:00:00', 25, 'daily');

-- USERS_PETS - Pet assignments
INSERT INTO USERS_PETS VALUES
('test_user_001_abc123def456ghi789', 'p1', TRUE, 'Lucky', FALSE, 5, 5),
('9Xyz2nNJpQcyRT8m2KHdxZpwUv23', 'p2', TRUE, 'Whiskers', TRUE, 5, 5),
('1Abc3oOKqRezSU9n3LIfaYqxTw34', 'p3', FALSE, 'Fluffy', TRUE, 5, 5),
('4Def6pPLrSfaTW0o4MJgbZryUx45', 'p1', TRUE, 'Buddy', FALSE, 5, 5),
('5Ghi9qQMsSgbUX1p5NKhcAsyVy56', 'p2', TRUE, 'Shadow', TRUE, 5, 5);

-- USERS_ITEMS - User inventory
INSERT INTO USERS_ITEMS VALUES
('test_user_001_abc123def456ghi789', 'i1', 3, 'toy', TRUE),
('9Xyz2nNJpQcyRT8m2KHdxZpwUv23', 'i2', 2, 'food', FALSE),
('1Abc3oOKqRezSU9n3LIfaYqxTw34', 'i3', 1, 'toy', TRUE),
('4Def6pPLrSfaTW0o4MJgbZryUx45', 'i1', 1, 'toy', FALSE),
('5Ghi9qQMsSgbUX1p5NKhcAsyVy56', 'i2', 4, 'food', TRUE);

