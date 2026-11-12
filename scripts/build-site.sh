#!/usr/bin/env bash
#
# Build the TYPO3 site the suite runs against: TYPO3 13 LTS with the official
# Introduction package (typo3/cms-introduction, Bootstrap Package theme), as a
# DDEV project in the current directory.
#
#   mkdir .typo3-site && cd .typo3-site && bash ../scripts/build-site.sh
#
# Environment:
#   DDEV_PROJECT       the DDEV project name (default: typo3-intro)
#   TYPO3_ADMIN_PASS   the password of the "admin" account (default: Introduction!23)
#   TYPO3_EDITOR_PASS  the password of the "editor" account (default: Editor!Review23)
#
set -euo pipefail

DDEV_PROJECT="${DDEV_PROJECT:-typo3-intro}"
TYPO3_ADMIN_PASS="${TYPO3_ADMIN_PASS:-Introduction!23}"
TYPO3_EDITOR_PASS="${TYPO3_EDITOR_PASS:-Editor!Review23}"

ddev config --project-type=typo3 --docroot=public --php-version=8.3 --project-name="$DDEV_PROJECT" --auto
ddev start
ddev composer create-project "typo3/cms-base-distribution:^13" . --no-interaction
ddev typo3 setup \
  --server-type=other \
  --driver=mysqli --host=db --port=3306 --dbname=db --username=db --password=db \
  --admin-username=admin --admin-user-password="$TYPO3_ADMIN_PASS" \
  --project-name="TYPO3 Introduction" \
  --no-interaction --force
ddev composer require typo3/cms-introduction --no-interaction

# extension:setup activates the Introduction package and imports its demo
# content and site configuration (config/sites/introduction).
ddev exec vendor/bin/typo3 extension:setup

# The demo content stores the search as a plugin of the old kind. `typo3 setup`
# marks every upgrade wizard as done before the content is imported, so run the
# wizard that turns the plugin into the "indexedsearch_pi2" content element.
ddev exec vendor/bin/typo3 upgrade:mark:undone indexedSearchCTypeMigration
ddev exec vendor/bin/typo3 upgrade:run indexedSearchCTypeMigration --no-interaction

# The search result templates of Bootstrap Package 15 call a ViewHelper that
# TYPO3 13.4 no longer ships, which breaks the result list. Use the templates
# of Indexed Search itself.
ddev mysql -e "UPDATE sys_template SET config = CONCAT(IFNULL(config, ''), '
plugin.tx_indexedsearch.view.templateRootPaths.20 >
plugin.tx_indexedsearch.view.templateRootPaths.21 >
plugin.tx_indexedsearch.view.partialRootPaths.20 >
plugin.tx_indexedsearch.view.partialRootPaths.21 >
plugin.tx_indexedsearch.view.layoutRootPaths.20 >
plugin.tx_indexedsearch.view.layoutRootPaths.21 >
') WHERE root = 1 AND (config IS NULL OR config NOT LIKE '%plugin.tx_indexedsearch.view.templateRootPaths.20 >%')"

# The accounts of the users registry in cucumber.js. "admin" is the account of
# `typo3 setup`; "editor" is a member of the "Advanced editors" group of the
# demo content (the Page, List and Forms modules on the pages of the site).
EDITOR_GROUP="$(ddev mysql -N -B -e "SELECT uid FROM be_groups WHERE title = 'Advanced editors' AND deleted = 0 LIMIT 1")"
ddev exec vendor/bin/typo3 backend:user:create --username=editor --password="$TYPO3_EDITOR_PASS" \
  --email=editor@example.com --groups="$EDITOR_GROUP" --no-interaction

ddev exec vendor/bin/typo3 cache:flush
