# Fleet Web

This React.js application allows users to view vehicles, parts, and jobs. This uses AppSync GraphQL Endpoints to sync jobs in real-time whenever the jobs gets updated in the Atlas. 

## Installation

To get started with the application, follow these steps:

1. **Navigate to the project directory:**

    ```bash
    cd frontend/iot-fleet-web
    ```

2. **Install dependencies:**

    ```bash
    npm install
    ```

## Configuration

Update the App Services Application ID in the config file

![AppUser](../media/fleet-ui-config-update.png)

## Usage

To start the application, use the following commands:

1. **Start the development server:**

    ```bash
    npm run dev
    ```

2. **Open your browser:**

    Once the development server starts, the application will be available at: `http://localhost:3000`.

  
## Features

### Viewing Vehicles

- The application provides a section to view a list of vehicles.
- Each vehicle listing might include details such as make, model, vin etc.

### Viewing Jobs

- The application offers a section to view available jobs.
- Job listings can contain information such as status, notes, assignee, etc.
