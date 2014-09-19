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

## How to use

First you need [mongodb](http://www.mongodb.org/) and
[redis](http://redis.io) running.
Also you need to have [bower](http://bower.io) installed.

Get the code:

    git clone https://github.com/ssiops/shiverview

Install node modules

    npm install

If you plan to use Google Analytics or Google OAuth 2, be sure to edit
`config.json` to make sure you have the right id, secret, token, etc.

Now launch the server

    node server

You can also use the following command line arguments:

    node server [-1 | --single] [-v | --verbose] [-d <working directory>]
                [-t | --test] [--port <http port>] [--ssl-port <https port>]

## How it works

### Infrastructure
The infrastructure gives means to load and unload applications and provides them
with necessary services such as database access, etc.

### Application
Each application is presented as a node module, with names starting with
“shiverview-”. The infrastructure will automatically load all applications
matching this naming scheme. Each application should contain a manifest.json,
which includes information and privileges of this application.

Here is an example of manifest.json:

    {
      "name": "shiverview-boilerplate",
      "desc": "Shiverview application boilerplate.",
      "path": "/boilerplate",
      "static": "static",
      "ui": { ... },
      "priviledges": {
        "database": "sv-core",
        "manager": true
      },
      "dependencies": { ... }
    }

The “path” field defines the URL path where the application is ‘mounted’. For
example, if we deploy an application with manifest defined as above, we can use
‘/boilerplate/’ to visit its index URL.

The “ui” object is handled by `shiverview-core-ui` and it defines how will this
application be displayed in the index page. Goto
[shiverview-core-ui](https://github.com/ssiops/shiverview-core-ui)
to learn more.

The “privileges” object defines how the application can access services. The
services section describes the

* `privileges.database` - the name of the database the application wish to
access. Each application can only access one database.
* `privileges.manager` - whether the application needs access to the app
manager, which can load, unload and view properties of all applications.
* `privileges.log` - whether the application needs to store logs
* `privileges.err` - whether the application needs to a the custom error object

### Services

#### services.config - app configuration
This object represents the app config as defined in `config.json`. The name of
each application and its configuration is represented by a key-value pair in
`config.json`.

#### services.db - database
This object is a thin wrap on mongodb methods. Each method will return a
promise. Refer to the
[mongodb manual](http://mongodb.github.io/node-mongodb-native/)
for more information.

Available methods:

* `db.insert(data, collection, options)`
* `db.remove(query, collection, options)`
* `db.update(query, data, coll, options)`
* `db.find(query, coll, options)`
* `db.aggregate(aggregation, coll, options)`
* `db.index(indexes)`

#### services.manager - application manager
Use this object to view information about other applications, or load/unload
an application.

Properties

* `apps` - an object containing all loaded apps
* `appNames` - a list of names of all loaded apps
* `status` - `'INIT'` or `'WORKING'`
* `server` - express server object
* `pkg` - package.json content

Methods

* `load(name, callback)`
* `unload(name, callback)`

#### services.log
Use this property as a constructor of log objects:

    var log = new services.log(req, 'Log title', 'log tags seperated by space');
    log.store();

#### services.err
Use this property as a constructor of error objects:

    var message = new Error('An error.');
    // or alternatively, var message = 'An error';
    var options = {
      stack: true, // include stack info in err object
      store: true, // store this error with a log
      req: req, // work with store: true
      storeStack: true, // include stack info in the log
    };
    var err = new services.err(message, options);

### Module Structure

#### Server

    server.js
    |-- lib/manager.js
    |   |-- lib/services/database.js
    |   |-- lib/services/log.js
    |-- lib/errHandler.js
    --- lib/init.js

#### Application

    index.js
    |-- routes.js
        |-- routes/*.js

### API for applications

If an application provides the following properties(functions), the
infrastructure will provide additional functionalities for this application:

* `app.init(services, callback)` - A function to be executed when loading the
app.
* `app.finally(callback)` - A function to be executed after all apps have been
loaded.

### Core Applications

* shiverview-core-ui
* shiverview-core-users
* shiverview-core-ops
