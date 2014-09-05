# Project Shiverview

## Symposis
Module-based Node framework which runs multiple web applications on a single
Node server.

## Introduction
As a front-end web developer, I love Node because it gives me a simple way to
build web server programs. I’ve been exploring many ways to deploy my
applications on the Internet, but so far I think the ‘coolest’ way is to deploy
on your own server. However, I did not wish to buy multiple vps, and I started
to explore ways to run multiple web applications on a single node server. The
resulting project, Starshard, accomplished this goal (sort of), but in a way
that seems un-elegant to me. So, here it is, project Shiverview.

## Infrastructure
The infrastructure gives means to load and unload applications and provides them
with necessary services such as database access, etc.

Application
Each application is presented as a node module, with names starting with
“shiverview-” or “sv-”. The infrastructure will automatically load all
applications matching this naming scheme. Each application should contain a
manifest.json, which includes information and privileges of this application.
Here is an example of manifest.json:

    {
      “name”: “shiverview-boilerplate”,
      “desc”: “Shiverview application boilerplate.”,
      “path”: “/boilerplate”,
      “static”: “static”,
      “ui”: {
        “icon”: “favicon.png”,
        “navName”: “Boilerplate”,
        “drawerName”: “Boilerplate”,
        “view”: “index.html”
      },
      “priviledges”: {
        “database”: “sv-core”,
        “manager”: true
      },
      “dependencies”: {}
    }

The “path” field defines the URL path where the application is ‘mounted’. For
example, if we deploy an application with manifest defined as above, we can use
‘/boilerplate/’ to visit its index URL.

The “ui” object defines how will this application be displayed in the index
page. If omitted, this application will not be shown on the ‘/’ page.

The “privileges” object defines how the application can access services.
For example, privileges.database shows the name of the database the application
wish to access. Each application can only access one database.

## Implementation Details

* Infrastructure routes
* Application routes
* Database API
* UI
* Static files
* Cluster
* Application load & unload

## Module Structure

#### Server

    server.js
    |-- lib/manager.js
    |   |-- lib/services/database.js
    |   |-- lib/services/log.js
    |-- lib/errHandler.js
    --- lib/init.js

#### Application

    index.js
    |-- lib/init.js
    |-- lib/routes.js
        |-- lib/routes/*.js

## Core Applications

* shiverview-core-ui
* shiverview-core-user
* shiverview-core-usercontent
* shiverview-core-notification
* shiverview-core-ops
