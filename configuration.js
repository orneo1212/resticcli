const path = require('path');
const fs = require('fs');
const os = require('os');

class Configuration {

    constructor(filename = ".restic_cli") {
        this.filename = filename;
        this.repositories = [];
        this.locations = {};
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
    }

    save() {
        this._cfg.repositories = this.repositories;
        this._cfg.locations = this.locations;
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
}

module.exports = Configuration;