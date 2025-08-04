# Requirements Document

## Introduction

The Electrician Shop Management System is a comprehensive web application designed to streamline business operations for an electrical services company. The system provides separate interfaces for administrators and customers, with role-based access control, billing management, customer management, and real-time updates. The application features a dark-mode interface built with modern web technologies and integrates with external services for authentication and content management.

## Requirements

### Requirement 1

**User Story:** As an administrator, I want to manage customer accounts centrally, so that I can control access and maintain customer information securely.

#### Acceptance Criteria

1. WHEN an administrator accesses the admin dashboard THEN the system SHALL display customer management options
2. WHEN an administrator creates a new customer account THEN the system SHALL generate a unique ID and secret key through Clerk
3. WHEN an administrator creates a customer account THEN the system SHALL store customer details (name, phone, location) in Sanity backend
4. WHEN an administrator deletes a customer account THEN the system SHALL remove all associated data and revoke access
5. IF a customer account is created THEN the system SHALL provide the ID and secret key to share with the customer
6. WHEN an administrator views customer list THEN the system SHALL display all customers with their basic information and status

### Requirement 2

**User Story:** As a customer, I want to log in using my provided credentials, so that I can access my billing information and manage my profile.

#### Acceptance Criteria

1. WHEN a customer visits the login page THEN the system SHALL display ID and secret key input fields
2. WHEN a customer enters valid credentials THEN the system SHALL authenticate through Clerk and redirect to customer dashboard
3. WHEN a customer enters invalid credentials THEN the system SHALL display an error message and prevent access
4. WHEN a customer successfully logs in THEN the system SHALL store their role and session information in Zustand
5. WHEN a customer is authenticated THEN the system SHALL allow access only to customer-specific pages
6. IF a customer session expires THEN the system SHALL redirect to login page

### Requirement 3

**User Story:** As an administrator, I want to create and manage bills for customers, so that I can track services provided and payments due.

#### Acceptance Criteria

1. WHEN an administrator creates a bill THEN the system SHALL allow selection of customer, items used, quantities, and service type
2. WHEN creating a bill THEN the system SHALL calculate total amount based on items, quantities, and location type (shop/home)
3. WHEN a bill includes home service THEN the system SHALL add home visit fee to the total
4. WHEN a bill is saved THEN the system SHALL store it in Sanity with timestamp and customer reference
5. WHEN a bill is created THEN the system SHALL send real-time notification to the customer via Socket.IO
6. WHEN an administrator views billing history THEN the system SHALL display all bills with filtering and search options

### Requirement 4

**User Story:** As a customer, I want to view my billing history, so that I can track services received and payments.

#### Acceptance Criteria

1. WHEN a customer accesses their billing book THEN the system SHALL display only their personal bills
2. WHEN displaying bills THEN the system SHALL show item details, quantities, service type, and total amount
3. WHEN a new bill is created for the customer THEN the system SHALL update their view in real-time
4. WHEN a customer views bill details THEN the system SHALL show breakdown of costs including items and service fees
5. IF no bills exist for a customer THEN the system SHALL display an appropriate empty state message

### Requirement 5

**User Story:** As an administrator, I want to generate sales reports, so that I can analyze business performance and profitability.

#### Acceptance Criteria

1. WHEN an administrator accesses sales reports THEN the system SHALL display total sales, profit, and loss calculations
2. WHEN generating reports THEN the system SHALL allow filtering by date range, customer, or service type
3. WHEN displaying sales data THEN the system SHALL show visual charts and graphs for better analysis
4. WHEN calculating profit THEN the system SHALL consider item costs, service fees, and operational expenses
5. WHEN exporting reports THEN the system SHALL provide downloadable formats (PDF, CSV)

### Requirement 6

**User Story:** As a user (admin or customer), I want to update my profile information, so that I can maintain accurate account details.

#### Acceptance Criteria

1. WHEN a user accesses profile settings THEN the system SHALL display current username and editable fields
2. WHEN a user updates their username THEN the system SHALL validate uniqueness and save changes
3. WHEN a user changes their password THEN the system SHALL require current password confirmation
4. WHEN profile changes are saved THEN the system SHALL update the information in Clerk
5. WHEN profile update fails THEN the system SHALL display specific error messages
6. IF a customer updates profile THEN the system SHALL only allow changes to username and password

### Requirement 7

**User Story:** As an administrator, I want to manage inventory items and pricing, so that I can maintain accurate billing information.

#### Acceptance Criteria

1. WHEN an administrator manages items THEN the system SHALL allow adding, editing, and deleting inventory items
2. WHEN creating an item THEN the system SHALL require name, price, and category information
3. WHEN updating item prices THEN the system SHALL apply changes to future bills only
4. WHEN categorizing items THEN the system SHALL support categories like wiring, fan, switch, and custom
5. WHEN deleting an item THEN the system SHALL prevent deletion if used in existing bills
6. WHEN viewing items THEN the system SHALL display all items with current pricing and availability

### Requirement 8

**User Story:** As a user, I want real-time notifications for important updates, so that I stay informed about billing and account changes.

#### Acceptance Criteria

1. WHEN a bill is created for a customer THEN the system SHALL send real-time notification via Socket.IO
2. WHEN a customer receives a notification THEN the system SHALL display it as a toast message
3. WHEN an administrator makes account changes THEN the system SHALL notify affected customers
4. WHEN notifications are displayed THEN the system SHALL allow dismissal and mark as read
5. IF connection is lost THEN the system SHALL queue notifications and deliver when reconnected

### Requirement 9

**User Story:** As a user, I want a responsive dark-mode interface, so that I can use the application comfortably on any device.

#### Acceptance Criteria

1. WHEN accessing the application THEN the system SHALL display a dark-themed interface by default
2. WHEN using on mobile devices THEN the system SHALL adapt layout for optimal mobile experience
3. WHEN navigating between pages THEN the system SHALL provide smooth animations via Framer Motion
4. WHEN interacting with modals and forms THEN the system SHALL provide visual feedback and animations
5. WHEN using form inputs THEN the system SHALL provide clear validation feedback and error states
6. IF accessibility features are needed THEN the system SHALL support keyboard navigation and screen readers
