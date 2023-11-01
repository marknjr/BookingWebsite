CREATE DATABASE climbingCo;
USE climbingCo;

CREATE TABLE instructor (instructor_id INT AUTO_INCREMENT PRIMARY KEY,
name VARCHAR(50),
email VARCHAR(50),
phone VARCHAR(50),
speciality VARCHAR(50),
availibility BOOLEAN,
hourlyRate FLOAT(10));

INSERT INTO instructor (name, email, phone,speciality,availibility,hourlyRate)VALUES('Mark Norman', 'marknorman99@gmail.com','07493883917','Climbing,Fitness',1,25.50),('Anna Lakeychuk', 'anna@gmail.com','07493883917','Climbing,Fitness',1,25.50) ;

CREATE TABLE event (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    instructor_id INT(50),
    eventType VARCHAR(50),
    dateOfEvent DATE,
    timeOfEvent TIME,
    location VARCHAR(50),
    maxAttendees INT(30),
    price FLOAT(20),
    FOREIGN KEY (instructor_id) REFERENCES instructor(instructor_id)

);

CREATE TABLE customer (
    customer_id INT PRIMARY KEY,
    name VARCHAR(50),
    username VARCHAR(50),
    hashedPassword VARCHAR(50),
    email VARCHAR(50),
    phone VARCHAR(50),
    preferredPaymentMethod VARCHAR(50)
);

CREATE TABLE bookings (
    booking_id INT PRIMARY KEY,
    customer_id INT,
    event_id INT,
    bookingDate DATE,
    paymentAmount FLOAT,
    paymentStatus VARCHAR(50),
    FOREIGN KEY (customer_id) REFERENCES customer(customer_id),
    FOREIGN KEY (event_id) REFERENCES Event(event_id)
);

CREATE TABLE privateBookings (
    privateBooking_id INT PRIMARY KEY,
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