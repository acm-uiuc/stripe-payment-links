# Linkry - Link Shortener

Linkry is an internal tool for shortening links and reducing link rot by redirecting users to an origin site from an organization-controlled link.

## Installation

Ensure that you have [Node](https://nodejs.org/en/) and [Yarn](https://yarnpkg.com/) installed on your machine. For non-ACM users, configure config.js to use your AAD tenant's client ID.
Then, run the following commands:
```bash
yarn
export proto=http
export baseURL=localhost:9215
export SESSION_DB_FILE_LOC=$PWD
export SESSION_DB_FILE_NAME=db.sqlite3 
export DB_FILE=db.sqlite3
export CLIENT_SECRET=<your azure AD secret here>
yarn dev
```

## Usage

Linkry integrates with Azure AD to only allow authorized ACM @ UIUC users to create link redirections. After you log in with your ACM @ UIUC credentials, you will be presented with a portal that will allow you to shorten links. In the navigation bar, there is also a "My Links" tab that will allow you to delete or edit any links you have previously made. Users must be assigned to a group that permits them access to the link shortener.

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## Authors
Maintainer: Dev Singh (<dsingh14@illinois.edu>)

## License
[BSD 3-Clause](https://raw.githubusercontent.com/acm-uiuc/linkry/master/LICENSE)
