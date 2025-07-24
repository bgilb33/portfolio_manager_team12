CREATE TABLE users (
	userID INT,
    name VARCHAR(50),
    email VARCHAR(50),
    PRIMARY KEY(userID)
);

CREATE TABLE ASSETS (
	symbol VARCHAR(50),
    name VARCHAR(50),
    asset_type ENUM('STOCK', 'BOND', 'CASH'),
    PRIMARY KEY(symbol)
);

CREATE TABLE holdings (
	holdingID INT,
    userID INT,
    symbol VARCHAR(50),
    purchase_price DOUBLE,
    quantity INT,
    purchase_date DATETIME,
    PRIMARY KEY(holdingID),
    FOREIGN KEY(userID) REFERENCES users(userID),
    FOREIGN KEY(symbol) REFERENCES assets(symbol)
)