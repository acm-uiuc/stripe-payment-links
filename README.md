# Epoch Link Shortener

The Epoch Link Shortener is an internal tool for shortening links and reducing link rot by redirecting users to an origin site from an Epoch-controlled link.

## Installation

Ensure that you have [Node](https://nodejs.org/en/) and [Yarn](https://yarnpkg.com/) installed on your machine. Then, run the following commands:

```bash
yarn
baseURL="localhost:9215" yarn dev # set the base URL environment variable for HTML formatting
```

## Usage

This tool integrates with the Epoch Single Sign-On service to only allow authorized Epoch users to create links redirections. After you log in with your Epoch credentials, you will be presented with a portal that will allow you to shorten links. In the navigation bar, there is also a "My Links" tab that will allow you to delete or edit any links you have previously made. 

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## Authors
Maintainer: Dev Singh (<dsingh@imsa.edu>)

## License
[BSD 3-Clause](https://raw.githubusercontent.com/epochml/link-shortener/master/LICENSE)