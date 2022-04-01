const { program, Command } = require('commander');
const { restic } = require('./api');
const { add_repository, remove_repository, list_repositories } = require('./repositories');
const { create_backup_of, clean_repository } = require('./commands');
const Configuration = require('./configuration');

let config = new Configuration();

program
  .description("Restic CLI interface for multi-repository managment")
  .version("0.1.0");

// SNAPSHOTS
program.command('snapshots')
  .description('Show snapshots')
  .argument("[params]")
  .action((params) => {
    let repo = config.repositories[0];
    if (!repo) {
      console.log("There no repositories added to be managed. see `resticcli help repo`");
      process.exit(1);
    }
    restic({
      RESTIC_PASSWORD: repo.password,
      AWS_ACCESS_KEY_ID: repo.remote_user,
      AWS_SECRET_ACCESS_KEY: repo.remote_password,
    }, "--repo=" + repo.location, "snapshots", "--group-by=paths", "-c");
  });

// BACKUP
program.command('backup')
  .description('Create backup of added locations or specified one ')
  .argument("[location]")
  .action(async (location) => {
    let repo = config.repositories[0];
    if (!repo) {
      console.log("There no repositories added to be managed. see `resticcli help repo`");
      process.exit(1);
    }
    let locations;
    if (location) locations = [location];
    else locations = config.locations;
    if (!locations) {
      console.log("No backup locations");
      process.exit(1);
    }

    // Create backup sequence
    locations.reduce(
      (p, x) => p.then(_ => create_backup_of(x.path, repo, x.tags)), Promise.resolve()
    );
  });

// CLEAN
program.command('clean')
  .description('Cleanup repository')
  .action((params) => {
    let repo = config.repositories[0];
    if (!repo) {
      console.log("There no repositories added to be managed. see `resticcli help repo`");
      process.exit(1);
    }
    clean_repository(repo);
  });

// Repositories Managment
let repos = new Command("repo").description("Manage multiple restic repositories");

// ADD
repos.command('add')
  .argument("<repo_name>")
  .argument("<repo_location>")
  .argument("<repo_password>")
  .argument("[remote_user]")
  .argument("[remote_password]")
  .description('Add new repository to managed repositories')
  .action((repo_name, repo_location, repo_password, remote_user, remote_password) => {
    add_repository(repo_name, repo_location, repo_password, remote_user, remote_password);
  });

// REMOVE
repos.command('remove')
  .argument("<repo_name>")
  .description('Remove repository from managed repositories')
  .action((repo_name) => {
    let status = remove_repository(repo_name);
    if (status) console.log("Repository " + repo_name + " removed. No longer managed by restic cli");
    else console.log("Repository " + repo_name + " not found");
  });

// LIST
repos.command('list', { isDefault: true })
  .description('List managed repositories')
  .action(() => {
    let repositories = list_repositories();
    if (repositories.length == 0) {
      console.warn("There no repositories");
    } else {
      console.log("Repositories:");
    }
    for (repo of repositories) {
      console.log(repo.name + " -> " + repo.location);
    }
  });

// Backup List
let backuplist = new Command("backups").description("Manage multiple backups directories");

// ADD BACKUP
backuplist.command('add')
  .argument("<backup_location>", description = "Path to backup directory or file")
  .argument("[tags]", description = "Optional tags seperated by comma")
  .description('Add new backup location')
  .action((backup_location, tags) => {
    if (config.add_backuplocation(backup_location, tags)) console.log("Backup location added/updated");
  });

// REMOVE
backuplist.command('remove')
  .argument("<backup_location>")
  .description('Remove backup location')
  .action((backup_location) => {
    if (config.remove_backuplocation(backup_location)) console.log("Backup location removed");
    else console.log("Backup location not found");
  });

// LIST
backuplist.command('list', { isDefault: true })
  .description('List added backup locations')
  .action(() => {
    if (config.locations.length == 0) {
      console.warn("There no backup locations");
    } else {
      console.log("Backup locations:");
      for (backup of config.locations) {
        if (backup.tags) console.log("  " + backup.path + " Tags: " + (backup.tags ? backup.tags : ""));
        else console.log("  " + backup.path);
      }
    }
  });

program.addCommand(repos);
program.addCommand(backuplist,);
program.parse();