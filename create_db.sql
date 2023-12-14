CREATE DATABASE climbingCo;
USE climbingCo;

CREATE TABLE instructor (
    instructor_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50),
    email VARCHAR(50) UNIQUE,
    phone VARCHAR(50),
    speciality VARCHAR(50),
    availibility BOOLEAN,
    hourlyRate FLOAT(10),
    hashedPassword VARCHAR(60)
);

DELIMITER //
CREATE PROCEDURE AddInstructor(
    IN p_name VARCHAR(50), 
    IN p_email VARCHAR(50), 
    IN p_phone VARCHAR(50), 
    IN p_speciality VARCHAR(50), 
    IN p_availibility BOOLEAN, 
    IN p_hourlyRate FLOAT(10), 
    IN p_hashedPassword VARCHAR(60))
BEGIN
    INSERT INTO instructor (name, email, phone, speciality, availibility, hourlyRate, hashedPassword) 
    VALUES (p_name, p_email, p_phone, p_speciality, p_availibility, p_hourlyRate, p_hashedPassword);
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE CreateEvent(
    IN p_instructor_id INT, 
    IN p_eventType VARCHAR(50), 
    IN p_dateOfEvent DATE, 
    IN p_timeOfEvent TIME, 
    IN p_location VARCHAR(50), 
    IN p_maxAttendees INT, 
    IN p_price FLOAT)
BEGIN
    INSERT INTO event (instructor_id, eventType, dateOfEvent, timeOfEvent, location, maxAttendees, price) 
    VALUES (p_instructor_id, p_eventType, p_dateOfEvent, p_timeOfEvent, p_location, p_maxAttendees, p_price);
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE EnlistEvent(
    IN p_customer_id INT, 
    IN p_event_id INT, 
    IN p_bookingDate DATE, 
    IN p_paymentAmount FLOAT, 
    IN p_paymentStatus VARCHAR(50))
BEGIN
    INSERT INTO bookings (customer_id, event_id, bookingDate, paymentAmount, paymentStatus) 
    VALUES (p_customer_id, p_event_id, p_bookingDate, p_paymentAmount, p_paymentStatus);
END //
DELIMITER ;



DELIMITER ;

INSERT INTO instructor (name, email, phone, speciality, availibility, hourlyRate) 
VALUES 
    ('Mark Norman', 'marknorman99@gmail.com', '07493883917', 'Climbing,Fitness', 1, 25.50),
    ('Anna Lakeychuk', 'anna@gmail.com', '07493883917', 'Climbing,Fitness', 1, 25.50);

CREATE TABLE event (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    instructor_id INT,
    eventType VARCHAR(50),
    dateOfEvent DATE,
    timeOfEvent TIME,
    location VARCHAR(50),
    maxAttendees INT,
    price FLOAT,
    FOREIGN KEY (instructor_id) REFERENCES instructor(instructor_id)
);

CREATE TABLE customer (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50),
    username VARCHAR(50) UNIQUE,
    hashedPassword VARCHAR(60),
    email VARCHAR(50),
    phone VARCHAR(50),
    preferredPaymentMethod VARCHAR(50)
);

CREATE TABLE bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT,
    event_id INT,
    bookingDate DATE,
    paymentAmount FLOAT,
    paymentStatus VARCHAR(50),
    FOREIGN KEY (customer_id) REFERENCES customer(customer_id),
    FOREIGN KEY (event_id) REFERENCES event(event_id)
);

CREATE TABLE privateBookings (
    privateBooking_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT,
    instructor_id INT,
    sessionDate DATE,
    sessionTime TIME,
    sessionLocation VARCHAR(50),
    paymentAmount FLOAT,
    paymentStatus VARCHAR(50),
    FOREIGN KEY (customer_id) REFERENCES customer(customer_id),
    FOREIGN KEY (instructor_id) REFERENCES instructor(instructor_id)
);

CREATE USER 'appuser'@'localhost' IDENTIFIED WITH mysql_native_password BY 'app2027';
GRANT ALL PRIVILEGES ON climbingCo.* TO 'appuser'@'localhost';