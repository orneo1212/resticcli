const { restic } = require('./api');

function create_backup_of(location, repo, tags_string) {
    return new Promise((resolve) => {
        console.log("Backing up " + location);
        if (tags_string) console.log("Tagged: " + tags_string);

        let tags = (tags_string ? tags_string : "").split(",").map((x) => "--tag " + x.trim());
        let command = restic({
            RESTIC_PASSWORD: repo.password,
            AWS_ACCESS_KEY_ID: repo.remote_user,
            AWS_SECRET_ACCESS_KEY: repo.remote_password,
        }, "--repo=" + repo.location, "backup", location, ...tags);
        command.on("exit", function (code) {
            resolve(code);
        });
    });
}

function clean_repository(repo) {
    console.log("Cleaning up repository " + repo.name);

    let unlock = new Promise((resolve) => {
        let command = restic({
            RESTIC_PASSWORD: repo.password,
            AWS_ACCESS_KEY_ID: repo.remote_user,
            AWS_SECRET_ACCESS_KEY: repo.remote_password,
        }, "--repo=" + repo.location, "unlock");
        command.on("exit", function (code) {
            resolve(code);
        });
    });

    return unlock.then(() => {
        let forget = new Promise((resolve) => {
            let command = restic({
                RESTIC_PASSWORD: repo.password,
                AWS_ACCESS_KEY_ID: repo.remote_user,
                AWS_SECRET_ACCESS_KEY: repo.remote_password,
            }, "--repo=" + repo.location, "forget", "--keep-within 6m", "--group-by=paths");
            command.on("exit", function (code) {
                resolve(code);
            });
        });

        return forget.then(() => {
            let command = restic({
                RESTIC_PASSWORD: repo.password,
                AWS_ACCESS_KEY_ID: repo.remote_user,
                AWS_SECRET_ACCESS_KEY: repo.remote_password,
            }, "--repo=" + repo.location, "prune");
            command.on("exit", function (code) {
            });
        });
    });

}

module.exports = {
    create_backup_of,
    clean_repository
};