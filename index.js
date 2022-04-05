const { program, Command } = require('commander');
const { add_repository, remove_repository, list_repositories } = require('./repositories');
const { call_restic_on, call_restic_with_both, create_backup_of, clean_repository, check_repository, copy_repository } = require('./commands');
const Configuration = require('./configuration');
const pjson = require('./package.json');
let config = new Configuration();

program
  .description("Restic CLI interface for multi-repository managment")
  .version(pjson.version)
  .addHelpText('after', "\nSelected repository: " + (config.get_selected_repo() ? config.get_selected_repo().name : ""))
  .configureHelp({ sortSubcommands: true });

// SELECT
program.command('select')
  .description('Select managed repository')
  .argument("[repo_name]")
  .action((repo_name) => {
    let repo = config.get_selected_repo(repo_name);
    if (!repo) {
      console.log("There no repository " + repo_name);
      process.exit(1);
    }
    if (!repo_name) {
      console.log("Choose from: " + (config.repositories.map(x => {
        if (x.name != repo.name) return "`" + x.name + "`";
        else return "(`" + x.name + "`)";
      }).join(" ")));
      process.exit(1);
    }
    config.selected_repo = repo_name;
    console.log('Selected `' + repo_name + "` repository");
    config.save();
  });

// SNAPSHOTS
program.command('snapshots')
  .description('Show snapshots')
  .argument("[params...]", "Optional arguments to restic `snapshots` command")
  .allowUnknownOption()
  .action((params) => {
    let repo = config.get_selected_repo();
    if (!repo) {
      console.log("There no repositories added to be managed. see `resticcli help repo`");
      process.exit(1);
    }
    call_restic_on(repo, "snapshots", "--group-by=paths", "-c", ...params);
  });

// BACKUP
program.command('backup')
  .description('Create backup of added locations or specified one ')
  .argument("[location]")
  .action(async (location) => {
    let repo = config.get_selected_repo();
    if (!repo) {
      console.log("There no repositories added to be managed. see `resticcli help repo`");
      process.exit(1);
    }
    let locations;
    if (location) locations = [{ path: location }];
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
    let repo = config.get_selected_repo();
    if (!repo) {
      console.log("There no repositories added to be managed. see `resticcli help repo`");
      process.exit(1);
    }
    clean_repository(repo);
  });

// CHECK
program.command('check')
  .description('Check data in repository')
  .action((params) => {
    let repo = config.get_selected_repo();
    if (!repo) {
      console.log("There no repositories added to be managed. see `resticcli help repo`");
      process.exit(1);
    }
    check_repository(repo);
  });

// COPY
program.command('copy')
  .description('Copy snapshots into specified repository')
  .argument("<repo_name>")
  .argument("[params...]", "Optional arguments to restic `copy` command")
  .allowUnknownOption()
  .action((repo_name, params) => {
    if (config.repositories.length < 2) {
      console.log("There no at least two repositories added to be managed. see `resticcli help repo`");
      process.exit(1);
    }
    let repo = config.get_selected_repo();
    let repo2 = config.get_selected_repo(repo_name);

    if (!repo || !repo2) {
      console.log("Invalid repository specified");
      process.exit(1);
    }

    if (repo === repo2) {
      console.log("Can't copy to same repo");
      process.exit(1);
    }
    copy_repository(repo, repo2, ...params);
  });

// RESTIC
program.command('restic')
  .description('Access orginal restic binary')
  .argument("[params...]", "Arguments to restic")
  .allowUnknownOption()
  .action((params) => {
    let repo = config.get_selected_repo();
    if (!repo) {
      console.log("There no repositories added to be managed. see `resticcli help repo`");
      process.exit(1);
    }
    call_restic_on(repo, ...params);
  });

// MOUNT
program.command('mount')
  .description('mount repository to browse it')
  .argument("[mount_point]", "Mount point")
  .action((mount_point) => {
    let repo = config.get_selected_repo();
    if (!repo) {
      console.log("There no repositories added to be managed. see `resticcli help repo`");
      process.exit(1);
    }
    call_restic_on(repo, "mount", mount_point);
  });

// INIT
program.command('init')
  .description('Initialize new repository in specified location - based on currelnt choosen repository')
  .argument("<repo_name>", "Repository name")
  .argument("<repo_location>", "New repository location")
  .action((repo_name, repo_location) => {
    let repo = config.get_selected_repo();
    if (!repo) {
      console.log("There no repositories added to be managed. see `resticcli help repo`");
      process.exit(1);
    }
    if (config.get_selected_repo(repo_name)) {
      console.log("Repository " + repo_name + " already added to resticcli. Choose another name");
      process.exit(1);
    }
    reponew = { name: repo_name, location: repo_location };
    call_restic_with_both(reponew, repo, "init", repo_location).then((code) => {
      // Repository created. add it to config and save
      if (code == 0) {
        config.repositories.push(reponew);
        config.save();
        console.log("Repository created at " + repo_location);
      }
    });
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