const { restic, restic_interactive, restic_raw } = require('./api');

function call_restic_with_both(repo, repo2, ...args) {
    return new Promise((resolve) => {
        let env = {};
        if (repo.password) env.RESTIC_PASSWORD = repo.password;

        // S3 Backend 
        if (repo.location.toLowerCase().indexOf("s3:http") !== -1) {
            env.AWS_ACCESS_KEY_ID = repo.remote_user;
            env.AWS_SECRET_ACCESS_KEY = repo.remote_password;
        }
        if (repo2) {
            if (repo2.password) env.RESTIC_PASSWORD2 = repo2.password;
            if (repo2.location.toLowerCase().indexOf("s3:http") !== -1) {
                env.AWS_ACCESS_KEY_ID = repo2.remote_user;
                env.AWS_SECRET_ACCESS_KEY = repo2.remote_password;
            }
        }
        let command;

        // interactive mode by default
        if (repo.noninteractive) {
            delete repo.noninteractive;
            command = restic(env, "--repo=" + repo.location, ...args);
        } else command = restic_interactive(env, "--repo=" + repo.location, ...args);

        command.on("exit", function (code) {
            resolve(code);
        });
    });
}

function call_restic_on(repo, ...args) {
    return call_restic_with_both(repo, null, ...args);
}

function call_restic_json(repo, ...args) {
    return new Promise((resolve) => {
        let env = {};
        if (repo.password) env.RESTIC_PASSWORD = repo.password;

        // S3 Backend 
        if (repo.location.toLowerCase().indexOf("s3:http") !== -1) {
            env.AWS_ACCESS_KEY_ID = repo.remote_user;
            env.AWS_SECRET_ACCESS_KEY = repo.remote_password;
        }
        let command = restic_raw(env, "--json", "--repo=" + repo.location, ...args);
        let data = [];

        command.stdout.on("data", function (code) {
            data.push(code);
        });
        command.on("exit", function (code) {
            resolve({ code: code, json: JSON.parse(data.join("")) });
        });
    });
}

function create_backup_of(location, repo, tags_string) {
    return new Promise((resolve) => {
        console.log("Backing up " + location);
        if (tags_string) console.log("Tagged: " + tags_string);

        let tags = (tags_string ? tags_string : "").split(",").map((x) => x ? "--tag " + x.trim() : "");
        call_restic_on(repo, "backup", "--one-file-system", location, ...tags).then((code) => {
            resolve(code);
        });
    });
}

function clean_repository(repo) {
    console.log("Cleaning up repository " + repo.name);

    let unlock = new Promise((resolve) => {
        call_restic_on(repo, "unlock").then((code) => {
            resolve(code);
        });
    });

    return unlock.then(() => {
        let forget = new Promise((resolve) => {
            call_restic_on(repo, "forget", "--keep-within 6m", "--group-by=paths").then((code) => {
                resolve(code);
            });
        });

        return forget.then(() => {
            call_restic_on(repo, "prune").then((code) => { });
        });

    });
}

function check_repository(repo) {
    console.log("Checking randomly 1% of data in " + repo.name);

    return new Promise((resolve) => {
        call_restic_on(repo, "check", "--read-data-subset 1%").then((code) => {
            resolve(code);
        });
    });
}

function copy_repository(source_repo, target_repo, ...params) {
    console.log("Copying repository " + source_repo.name + " to repository " + target_repo.name);

    return new Promise((resolve) => {
        call_restic_with_both(source_repo, target_repo, "copy", "--repo2=" + target_repo.location, ...params)
            .then((code) => {
                resolve(code);
            });
    });
}

module.exports = {
    call_restic_on,
    call_restic_with_both,
    call_restic_json,
    create_backup_of,
    clean_repository,
    check_repository,
    copy_repository
};