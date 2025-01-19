#!/bin/bash

# Get the directory to list (default to current directory if none provided)
DIR=${1:-.}

# Output the directory structure excluding node_modules
echo "Directory structure of $DIR (excluding node_modules)"
echo "----------------------------------------------------"
tree -a -I 'node_modules|.git|.DS_Store' "$DIR"