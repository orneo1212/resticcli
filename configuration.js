const path = require('path');
const fs = require('fs');
const os = require('os');

class Configuration {

    constructor(filename = ".restic_cli") {
        this.filename = filename;
        this.repositories = [];
        this.locations = {};
        this.selected_repo = "";
        this._cfg = this.loadConfig();
        this.parseConfig(this._cfg);
    }

    loadConfig() {
        const configpath = path.resolve(path.join(os.homedir(), this.filename));
        var config = {};
        try {
            config = JSON.parse(fs.readFileSync(configpath, 'utf-8'));
        } catch (error) { }

        if (!config.repositories) config.repositories = [];
        if (!config.locations) config.locations = [];
        if (!config.selected) config.selected = "";
        return config;
    }

    saveConfig(config) {
        const configpath = path.resolve(path.join(os.homedir(), this.filename));
        fs.writeFileSync(configpath, JSON.stringify(config, false, 2));
    }

    parseConfig(config) {
        if (config.repositories) {
            this.repositories = config.repositories;
        }
        if (config.locations) {
            this.locations = config.locations;
        }
        // Make sure selected repository exists
        if (config.selected && !this.repositories.find((x) => x.name == config.selected)) config.selected = "";
        else this.selected_repo = config.selected;

        // Select repository when no selected
        if (!config.selected) {
            if (this.repositories.length > 0) {
                this.selected_repo = this.repositories[0].name;
            }
        }
    }

    save() {
        this._cfg.repositories = this.repositories;
        this._cfg.locations = this.locations;
        this._cfg.selected = this.selected_repo;
        this.saveConfig(this._cfg);
    }

    add_backuplocation(backup_location, tags = "") {
        let matching = this.locations.find((x) => x.path == backup_location);
        if (matching) {
            matching['tags'] = tags;
            this.save();
            return true;
        } else {
            let nbl = { path: backup_location };
            if (tags) nbl.tags = tags;
            this.locations.push(nbl);
            this.save();
            return true;
        }
    }

    remove_backuplocation(backup_location) {
        let matching = this.locations.find((x) => x.path == backup_location);
        if (matching) {
            let index = this.locations.indexOf(matching);
            this.locations.splice(index, 1);
            this.save();
            return true;
        }
    }

    get_selected_repo(repo_name = "") {
        let rname = repo_name ? repo_name : this.selected_repo;
        return this.repositories.find((x) => x.name == rname);
    }
}

module.exports = Configuration;