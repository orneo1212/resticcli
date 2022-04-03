var spawn = require('child_process').spawn;

let RESTIC_BINARY = "restic";

module.exports = {
    RESTIC_BINARY,

    restic: function restic(env = {}, ...args) {
        let tmpenv = process.env;
        Object.assign(tmpenv, env);
        command = spawn(RESTIC_BINARY, args, { shell: true, env: tmpenv });

        command.stdout.on('data', function (data) {
            if (data) console.log(data.toString());
        });

        command.stderr.on('data', function (data) {
            if (data) console.log(data.toString());
        });

        return command;
    },

    restic_interactive: function restic_interactive(env = {}, ...args) {
        let tmpenv = process.env;
        Object.assign(tmpenv, env);
        command = spawn(RESTIC_BINARY, args, { shell: true, env: tmpenv, stdio: 'inherit' });
        return command;
    }
};