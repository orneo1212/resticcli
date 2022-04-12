# resticcli
[Restic](https://github.com/restic/restic) CLI interface for multi-repository managment
```
Usage: index [options] [command] 

Restic CLI interface for multi-repository managment

Options:
  -V, --version                     output the version number
  -h, --help                        display help for command

Commands:
  backup [location]                 Create backup of added locations or specified one
  backups                           Manage multiple backups directories
  check                             Check data in repository
  clean                             Cleanup repository
  copy <repo_name> [params...]      Copy snapshots into specified repository
  help [command]                    display help for command
  init <repo_name> <repo_location>  Initialize new repository in specified location - based on
                                    currelnt choosen repository
  mount [mount_point]               mount repository to browse it
  repo                              Manage multiple restic repositories
  restic [params...]                Access orginal restic binary
  select [repo_name]                Select managed repository
  snapshots [params...]             Show snapshots
```

## Build
```
  yarn install
  yarn build
```

Executables will be places in `build` directory.
