# Stripe Link Creator


## Installation

Pull the published Docker container using the appropriate version: `docker pull ghcr.io/acm-uiuc/stripe-links:latest`.

Create a `.env` file that contains the following keys:
```bash
NODE_ENV=production # or development if in development mode
BASE_URL=stripelinks.acm.illinois.edu # production URL
BASE_PROTO=https # http vs. https
AAD_CLIENT_ID=0 # Client ID in Azure Active Directory (ensure idtoken flow is enabled).
AAD_TENANT_ID=0 # Azure AD Tenant ID
AAD_CLIENT_SECRET= # Azure AD client secret for respective client ID. 
brandTitle=Stripe Link Creator # HTML title
brandLoginProvider=ACM # Custom name for AAD Auth Provider
brandLogoPath=https://go.acm.illinois.edu/static/img/white-banner.svg # path to banner logo 
brandOrgHome=https://acm.illinois.edu # main home page
brandStatusURL=https://status.acm.illinois.edu # Status page
brandCopyrightOwner=ACM @ UIUC # Corporation Name
brandDomainHint=illinois.edu # Azure AD Domain Hint
GROUPS_PERMITTED=ACM Exec,ACM Officers,Infra Chairs # Groups that can access the service
```
Then, use the following docker-compose.yml in the same directory and run `docker-compose up` to start the application (it will be exposed on port 9215):
```yml
version: '3'
services:
  stripes:
    image: ghcr.io/acm-uiuc/stripe-links:latest
    restart: on-failure
    ports:
      - "9216:9215"
    volumes:
      - ./.env:/usr/src/app/.env
```

## Usage

Stripe Link Creator integrates with Azure AD to only allow authorized ACM @ UIUC users to create link redirections. After you log in with your ACM @ UIUC credentials, you will be presented with a portal that will allow you to create links.

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## Authors
Maintainer: Dev Singh (<dsingh14@illinois.edu>)

## License
[BSD 3-Clause](https://raw.githubusercontent.com/acm-uiuc/stripe-payment-links/master/LICENSE)

