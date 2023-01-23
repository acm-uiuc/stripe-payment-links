# Linkry - Link Shortener

Linkry is an internal tool for shortening links and reducing link rot by redirecting users to an origin site from an organization-controlled link.

## Installation

Pull the published Docker container using the appropriate version: `docker pull ghcr.io/acm-uiuc/linkry:latest`.

Create a `.env` file that contains the following keys:
```bash
NODE_ENV=production # or development if in development mode
BASE_URL=go.acm.illinois.edu # production URL
BASE_PROTO=https # http vs. https
AAD_CLIENT_ID=0 # Client ID in Azure Active Directory (ensure idtoken flow is enabled).
AAD_TENANT_ID=0 # Azure AD Tenant ID
AAD_CLIENT_SECRET= # Azure AD client secret for respective client ID. 
brandTitle=ACM Link Shortener # HTML title
brandLoginProvider=ACM # Custom name for AAD Auth Provider
brandLogoPath=https://go.acm.illinois.edu/static/img/white-banner.svg # path to banner logo 
brandOrgHome=https://acm.illinois.edu # main home page
brandStatusURL=https://status.acm.illinois.edu # Status page
brandCopyrightOwner=ACM @ UIUC # Corporation Name
brandDomainHint=devksingh.com # Azure AD Domain Hint
DB_FILE=/usr/src/app/db.sqlite3 # where the DB of links is.
GROUPS_PERMITTED=ACM Link Shortener Admins, ACM Exec # Groups that can access the link shortener
```
Then, use the following docker-compose.yml in the same directory and run `docker-compose up` to start the application (it will be exposed on port 9215):
```yml
version: '3'
services:
  linkry:
    image: ghcr.io/acm-uiuc/linkry:latest
    restart: on-failure
    environment:
      - DB_FILE=/usr/src/app/db.sqlite3
    ports:
      - "9215:9215"
    volumes:
      - ./.env:/usr/src/app/.env
      - ./db.sqlite3:/usr/src/app/db.sqlite3
```

## Usage

Linkry integrates with Azure AD to only allow authorized ACM @ UIUC users to create link redirections. After you log in with your ACM @ UIUC credentials, you will be presented with a portal that will allow you to shorten links. In the navigation bar, there is also a "My Links" tab that will allow you to delete or edit any links you have previously made. Users must be assigned to a group that permits them access to the link shortener.

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## Authors
Maintainer: Dev Singh (<dsingh14@illinois.edu>)

## License
[BSD 3-Clause](https://raw.githubusercontent.com/acm-uiuc/linkry/master/LICENSE)

