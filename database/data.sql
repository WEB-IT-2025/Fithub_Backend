-- ============================
-- 🚨 1. DROP TABLES IF EXISTS
-- ============================
DROP TABLE IF EXISTS users_items;
DROP TABLE IF EXISTS users_pets;
DROP TABLE IF EXISTS exercis;
DROP TABLE IF EXISTS contributions;
DROP TABLE IF EXISTS mission_cleard;
DROP TABLE IF EXISTS mission;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS group_member;
DROP TABLE IF EXISTS group_info;
DROP TABLE IF EXISTS pets;
DROP TABLE IF EXISTS threshold;
DROP TABLE IF EXISTS users;

-- ============================
-- 🧱 2. CREATE TABLES (PK → FK順)
-- ============================

CREATE TABLE users (
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

CREATE TABLE pets (
    pet_id VARCHAR(255) PRIMARY KEY,
    pet_name VARCHAR(20) NOT NULL,
    pet_image_folder VARCHAR(255) NOT NULL
);

CREATE TABLE items (
    item_id VARCHAR(255) PRIMARY KEY,
    item_name VARCHAR(50) NOT NULL,
    item_point INT NOT NULL,
    sold_count INT NOT NULL,
    item_image_folder VARCHAR(255) NOT NULL,
    item_create_day TIMESTAMP NOT NULL,
    item_delete_day TIMESTAMP NOT NULL
);

CREATE TABLE threshold (
    steps_point_settings INT NOT NULL,
    pet_size_logic INT NOT NULL,
    pet_health_logic INT NOT NULL,
    exercise_settings INT NOT NULL
);

CREATE TABLE group_info (
    group_id VARCHAR(255) PRIMARY KEY,
    admin_id VARCHAR(255) NOT NULL,
    group_name VARCHAR(20) NOT NULL,
    max_person INT NOT NULL,
    back_image VARCHAR(255) NOT NULL,
    FOREIGN KEY (admin_id) REFERENCES users(user_id)
);

CREATE TABLE group_member (
    group_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES group_info(group_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE exercise (
    user_id VARCHAR(20) NOT NULL,
    day TIMESTAMP NOT NULL,
    exercise_quantity VARCHAR(255) NOT NULL,
    PRIMARY KEY (user_id, day),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE contributions (
    user_id VARCHAR(255) NOT NULL,
    day TIMESTAMP NOT NULL,
    count VARCHAR(255) NOT NULL,
    PRIMARY KEY (user_id, day),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE mission (
    mission_id VARCHAR(255) PRIMARY KEY,
    mission_name VARCHAR(50) NOT NULL,
    mission_goal VARCHAR(255) NOT NULL,
    reward_content INT NOT NULL,
    mission_type VARCHAR(255) NOT NULL
);

CREATE TABLE mission_cleard (
    user_id VARCHAR(255) NOT NULL,
    mission_id VARCHAR(255) NOT NULL,
    mission_goal INT NOT NULL,
    current_status INT,
    clear_status BOOLEAN NOT NULL,
    clear_time TIMESTAMP,
    PRIMARY KEY (user_id, mission_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (mission_id) REFERENCES mission(mission_id)
);

CREATE TABLE users_pets (
    user_id VARCHAR(255) NOT NULL,
    pet_id VARCHAR(255) NOT NULL,
    user_main_pet BOOLEAN NOT NULL,
    user_pet_name VARCHAR(20) NOT NULL,
    user_sub_pet BOOLEAN,
    pet_size VARCHAR(10),
    PRIMARY KEY (user_id, pet_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (pet_id) REFERENCES pets(pet_id)
);

CREATE TABLE users_items (
    user_id VARCHAR(255) NOT NULL,
    item_id VARCHAR(255) NOT NULL,
    item_count INT NOT NULL,
    category VARCHAR(255) NOT NULL,
    usage_state BOOLEAN,
    PRIMARY KEY (user_id, item_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (item_id) REFERENCES items(item_id)
);

-- ============================
-- 📦 3. INSERT SAMPLE DATA
-- ============================

INSERT INTO threshold VALUES (1, 1, 1, 1);

-- Users
INSERT INTO users VALUES
('u1', 'Alice', 'icon1.png', 100, 'g_token1', 'g_refresh1', '2025-06-23 07:02:06', 'gh_token1', 'gh_refresh1', '2025-06-23 07:02:06', 'gh_id1', 'gh_user1'),
('u2', 'Bob', 'icon2.png', 200, 'g_token2', 'g_refresh2', '2025-06-23 07:02:06', 'gh_token2', 'gh_refresh2', '2025-06-23 07:02:06', 'gh_id2', 'gh_user2'),
('u3', 'Carol', 'icon3.png', 300, 'g_token3', 'g_refresh3', '2025-06-23 07:02:06', 'gh_token3', 'gh_refresh3', '2025-06-23 07:02:06', 'gh_id3', 'gh_user3');

-- Pets
INSERT INTO pets VALUES
('p1', 'Dog', 'folder1'),
('p2', 'Cat', 'folder2'),
('p3', 'Rabbit', 'folder3');

-- Items
INSERT INTO items VALUES
('i1', 'Ball', 10, 100, 'folder1', '2025-06-23 07:02:06', '2025-06-23 07:02:06'),
('i2', 'Bone', 15, 50, 'folder2', '2025-06-23 07:02:06', '2025-06-23 07:02:06'),
('i3', 'Bell', 20, 80, 'folder3', '2025-06-23 07:02:06', '2025-06-23 07:02:06');

-- Group Info
INSERT INTO group_info VALUES
('g1', 'u1', 'Group A', 10, 'bg1.jpg'),
('g2', 'u2', 'Group B', 8, 'bg2.jpg'),
('g3', 'u3', 'Group C', 5, 'bg3.jpg');

-- Group Member
INSERT INTO group_member VALUES
('g1', 'u1'),
('g1', 'u2'),
('g2', 'u2'),
('g2', 'u3'),
('g3', 'u3'),
('g3', 'u1');

-- Exercis（ユーザー運動）
INSERT INTO exercis VALUES
('u1', '2025-06-21 00:00:00', '5000'),
('u2', '2025-06-21 00:00:00', '8000'),
('u3', '2025-06-21 00:00:00', '12000');

-- Contributions
INSERT INTO contributions VALUES
('u1', '2025-06-21 00:00:00', '3'),
('u2', '2025-06-21 00:00:00', '4'),
('u3', '2025-06-21 00:00:00', '6');

-- Missions
INSERT INTO mission VALUES
('m1', 'Daily Walk', 'Walk 5000 steps', '10pt', 'daily'),
('m2', 'Weekly Goal', 'Walk 30000 steps', '50pt', 'weekly'),
('m3', 'Stretch', 'Stretch 10 min', '5pt', 'daily');

-- Missions Cleared
INSERT INTO mission_cleard VALUES
('u1', 'm1', 'daily', 5000, 5000, TRUE, '2025-06-21 12:00:00'),
('u2', 'm2', 'weekly', 30000, 25000, FALSE, NULL),
('u3', 'm3', 'daily', 10, 10, TRUE, '2025-06-21 08:00:00');

-- Users Pets
INSERT INTO users_pets VALUES
('u1', 'p1', TRUE, 'Buddy', FALSE, 'M'),
('u2', 'p2', TRUE, 'Mimi', TRUE, 'S'),
('u3', 'p3', FALSE, 'Fluffy', TRUE, 'L');

-- Users Items
INSERT INTO users_items VALUES
('u1', 'i1', 2, 'toy', TRUE),
('u2', 'i2', 1, 'food', FALSE),
('u3', 'i3', 3, 'toy', TRUE);