# Strava Stats

This application integrates with the Strava API to provide in-depth analysis of a user's running statistics and generate interesting metrics from their past runs.

## Project Overview

The Strava Stats Analyzer offers runners a comprehensive view of their performance and progress over time. Key features include:

- Strava API integration for accessing user running data
- Analysis of past runs to extract meaningful statistics
- Advanced API wrapper with rate limiting and error handling
- Comprehensive activity data storage and processing

## Getting Started

To run this project locally, follow these steps:

1. Clone the repository:
   ```bash
   git clone git@github.com:Tourniercy/Stravastats.git
   ```

2. Navigate to the project directory:
   ```bash
   cd Stravastats
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Set up environment variables:
   - Copy the `.env.example` file to `.env.local`
   - Update the variables in `.env.local` with your Strava API credentials and other configuration details

5. Run the development server:
   ```bash
   pnpm dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Roadmap

- [x] Set up Next.js project structure
- [x] Implement basic routing
- [x] Implement Strava API integration
  - [x] Set up OAuth 2.0 authentication flow
  - [x] Implement API calls to fetch user running data
  - [x] Create comprehensive API wrapper with rate limiting
  - [x] Add automatic token refresh and error handling
- [x] Parse and store running data
- [ ] Design and implement main layout component
- [ ] Create landing page explaining the app's purpose
- [ ] Develop core analysis features
  - [ ] Calculate basic statistics (distance, time, pace, etc.)
  - [ ] Generate advanced metrics (e.g., VO2 max estimates, training load)
- [ ] Create data visualization components
- [ ] Implement comparison features
  - [ ] Compare runs over time
  - [ ] Benchmark against personal bests
- [ ] Implement data caching for improved performance
- [ ] Develop export functionality for reports
- [ ] Implement responsive design for mobile devices
- [ ] Optimize performance and loading times
- [ ] Deploy to production

## Architecture

### API Wrapper
The project includes a sophisticated Strava API wrapper (`src/lib/strava-api-wrapper.ts`) that handles:

- **Rate Limiting**: Automatic handling of Strava's 15-minute and daily rate limits
- **Token Management**: Automatic token refresh when expired
- **Error Handling**: Comprehensive retry logic for network errors and API limits
- **Monitoring**: Rate limit tracking and logging utilities

### Database Schema
- User authentication via NextAuth with Strava OAuth
- Activity storage with both summary and detailed data
- Support for best effort times and advanced metrics

## Contributing

We welcome contributions to improve StravaStats. Please read our CONTRIBUTING.md file for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE.md file for details.

## Disclaimer

This application is not officially associated with Strava. It uses the Strava API in accordance with their terms of service.