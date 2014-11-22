# Sendmail transport module for Nodemailer

Applies for Nodemailer v1.x and not for v0.x where transports are built-in.

## Usage

Install with npm

    npm install nodemailer-sendmail-transport

Require to your script

```javascript
var nodemailer = require('nodemailer');
var sendmailTransport = require('nodemailer-sendmail-transport');
```

Create a Nodemailer transport object

```javascript
var transporter = nodemailer.createTransport(sendmailTransport(options))
```

Where

  * **options** defines sendmail data
    * **path** - path to the `sendmail` command (defaults to *'sendmail'*)
    * **args** - an array of extra command line options to pass to the `sendmail` command (ie. `["-f", "foo@blurdybloop.com"]`).

Currently the command to be spawned is built up like this: the command is either using `sendmail -i -f from_addr to_addr[]` (by default) or `sendmail -i list_of_args[]` (if `args` property was given). `-i` is ensured to be present on either case.

In the default case (no `args` defined) From and To addresses are either taken from `From`,`To`, `Cc` and `Bcc` properties or from the `envelope` property if one is present.

Be wary when using the `args` property - no recipients are defined by default, you need to ensure these by yourself, for example by using the `-t` flag.

**Example**

```javascript
var transporter = nodemailer.createTransport(sendmailTransport({
    path: '/usr/share/sendmail'
}));
```

## License

**MIT**