const Configuration = require('./configuration');

let config = new Configuration();

function add_repository(repo_name, repo_location, repo_password, remote_user, remote_password) {
    config.repositories.push({
        name: repo_name,
        location: repo_location,
        password: repo_password,
        remote_user: remote_user ? remote_user : null,
        remote_password: remote_password ? remote_password : null,
    });
    config.save();
}
function remove_repository(repo_name) {
    for (id in config.repositories) {
        if (repo_name == config.repositories[id].name) {
            config.repositories.splice(id, 1);
            config.save();
            return true;
        }
    }
    return false;
}
function list_repositories() {
    return config.repositories;
}

module.exports = {
    add_repository,
    remove_repository,
    list_repositories
};