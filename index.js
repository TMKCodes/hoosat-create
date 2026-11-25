#!/usr/bin/env node
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { join } from 'node:path';

const repository = 'https://github.com/TMKCodes/hoosat-template.git';
const hoosatUIRepository = 'https://github.com/hoosat-oy/HoosatUI';
const minimumNodeMajor = 22;

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

async function run() {
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  if (nodeMajor < minimumNodeMajor) {
    console.warn(`Warning: Node.js ${process.versions.node} is not supported anymore. Please use Node.js ${minimumNodeMajor} or newer (https://nodejs.org).`);
  }

  const command = process.argv[2];

  if (command === 'submodule') {
    console.log('Creating a submodule for project.');
    const rootDirectory = process.cwd();
    const destination = getValueFromArgument('destination') || (await askQuestion('Enter relative destination for new submodule: '));
    try {
      await runCommand('git', ['rev-parse', '--is-inside-work-tree'], 'Current working directory is not git repository.');
    } catch (error) {
      console.error(error.message);
      throw error;
    }
    // mkdir submodule-destination
    try {
      await fs.promises.mkdir(destination, { recursive: true });
      console.log("Created submodule folder.");
    } catch (error) {
      console.error(error.message);
    }
    // cd submodule-destination, git init, commit a README and cd back to root of project
    process.chdir(destination);
    try {
      await runCommand('git', ['init'], 'Failed to initialize git for submodule.');
      console.log("Initialized git repository.");
    } catch (error) {
      console.error(error.message);
    }
    try {
      if (!fs.existsSync('./README.md')) {
        fs.writeFileSync('./README.md', '');
      }
      console.log("Created README.md file for commit.");
    } catch (error) {
      console.error('Failed to create README.md file', error.message);
    }
    try {
      await runCommand('git', ['add', './README.md'], 'Failed to stage README.md.');
      console.log("Staged README.md");
    } catch (error) {
      console.error(error.message);
    }
    try {
      await runCommand('git', ['commit', '-m', 'Add readme.'], 'Failed to commit.');
      console.log("Committed readme.");
    } catch (error) {
      console.error(error.message);
    }
    // Change back to the root of the project
    process.chdir(rootDirectory);
    // git submodule add ./submodule-destination submodule-destination
    // Giving the path registers the existing repository in place. Without it git tries to clone it
    // over the "file" transport, which git 2.38.1+ blocks by default (CVE-2022-39253).
    try {
      await runCommand('git', ['submodule', 'add', `./${destination}`, destination], 'Failed to add the new local repository as git submodule');
      console.log("Added local repository as git submodule to parent git repository.");
    } catch (error) {
      console.error(error.message);
    }
    console.log("Now commit your changes to git.");
    rl.close();
  } else {
    console.log('Creating a new project from Hoosat React SSR Template.');
    const destination = getValueFromArgument('destination') || (await askQuestion('Enter destination project name: '));
    const description = getValueFromArgument('description') || (await askQuestion('Enter project description: '));
    const author = getValueFromArgument('author') || (await askQuestion('Enter project author: '));
    const license = getValueFromArgument('license') || (await askQuestion('Enter project license: '));
    const keywords = getValueFromArgument('keywords') || (await askQuestion('Enter project keywords (comma-separated): '));
    const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k !== '');
    const gitInit = getYesNoFromArgument('gitInit') ?? (await askYesNoQuestion('Do you want to initialize a git repository? [Y/n] '));
    let installHoosatUI = false;
    if (gitInit) {
      installHoosatUI = getYesNoFromArgument('hoosatui') ?? (await askYesNoQuestion('Do you want to install HoosatUI? [Y/n] '));
    }
    try {
      // Clone git repository.
      await runCommand('git', ['clone', '--recursive', repository, destination], 'Failed to clone project.', { stdio: 'inherit' });
      console.log('Project cloned successfully.');
      // Change directory to the project directory
      process.chdir(destination);
      // Modify the package.json
      const packageJsonPath = join(process.cwd(), 'package.json');
      const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageJsonContent);
      packageJson.name = destination;
      packageJson.description = description;
      packageJson.author = author;
      packageJson.license = license;
      packageJson.keywords = keywordList;
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log('Project package.json has been modified.');
      // Do NPM install for dependencies.
      try {
        await runCommand('npm', ['install'], 'Failed to install project template dependencies.', { stdio: 'inherit' });
        console.log('Project template dependencies installed with npm.');
      } catch (error) {
        console.error(error.message);
      }
      if (gitInit) {
        // Initialize git repository
        try {
          await runCommand('git', ['init'], 'Failed to initialize git repository.', { stdio: 'inherit' });
          await runCommand('git', ['remote', 'rm', 'origin'], 'Failed to remove origin remote from git repository.', { stdio: 'inherit' });
          console.log('Git has been initialized.');
        } catch (error) {
          console.error(error.message);
        }
        console.log('Git repository initialized.');
        if (installHoosatUI) {
          // Change directory to the client directory
          process.chdir('src/client');
          // Clone HoosatUI repository
          try {
            await runCommand('git', ['submodule', 'add', hoosatUIRepository], 'Failed to add submodule HoosatUI.', { stdio: 'inherit' });
            console.log('HoosatUI cloned successfully as submodule in src/client/HoosatUI.');
          } catch (error) {
            console.error(error.message);
          }
          // Install necessary dev-dependencies
          try {
            await runCommand('npm', ['install', '--save-dev', '@testing-library/jest-dom', '@testing-library/react', '@testing-library/dom'], 'Failed to install HoosatUI devDependencies.', { stdio: 'inherit' });
            console.log('npm HoosatUI devDependencies installed successfully.');
          } catch (error) {
            console.error(error.message);
          }
          // Install necessary dependencies.
          try {
            await runCommand('npm', ['install', 'react-markdown', 'rehype-highlight', 'remark-gfm'], 'Failed to install HoosatUI dependencies.', { stdio: 'inherit' });
            console.log('npm HoosatUI dependencies installed successfully.');
          } catch (error) {
            console.error(error.message);
          }
        }
      }
    } catch (err) {
      console.error(`Failed to create project: ${err.message}`);
      process.exitCode = 1;
    } finally {
      rl.close();
    }
  }
}

/**
 * Runs a command without a shell, so arguments (like the project name) can never be
 * interpreted as shell syntax. Only npm on Windows needs a shell, because it is a .cmd file
 * and Node.js refuses to spawn those without one; its arguments are always static strings here.
 */
function runCommand(command, args, errorMessage, spawnOptions = {}) {
  const needsShell = process.platform === 'win32' && command === 'npm';
  return new Promise((resolve, reject) => {
    const commandProcess = needsShell
      ? spawn([command, ...args].join(' '), { ...spawnOptions, shell: true })
      : spawn(command, args, { ...spawnOptions, shell: false });
    const fail = (reason) => reject(new Error(`${command} ${args.join(' ')}\r\n${errorMessage}${reason ? ` (${reason})` : ''}`));
    commandProcess.on('error', (error) => fail(error.message));
    commandProcess.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        fail(`exit code ${code}`);
      }
    });
  });
}

function getValueFromArgument(argName) {
  const argIndex = process.argv.findIndex(arg => arg === `--${argName}`);
  if (argIndex !== -1 && argIndex + 1 < process.argv.length) {
    const value = process.argv[argIndex + 1];
    if (containsInvalidCharacters(value)) {
      throw new Error(`Invalid value for --${argName}. The value contains invalid characters.`);
    }
    return value;
  }
  return undefined;
}

/**
 * Reads a yes/no command line argument, for example `--gitInit Y` or `--gitInit n`.
 * @returns {boolean | undefined} undefined when the argument was not given.
 */
function getYesNoFromArgument(argName) {
  const value = getValueFromArgument(argName);
  if (value === undefined) {
    return undefined;
  }
  const answer = parseYesNo(value);
  if (answer === undefined) {
    throw new Error(`Invalid value for --${argName}. Please provide a valid yes/no answer (Y/n).`);
  }
  return answer;
}

function parseYesNo(value) {
  const normalized = value.trim().toLowerCase();
  if (normalized === '' || normalized === 'y' || normalized === 'yes' || normalized === 'true') {
    return true;
  }
  if (normalized === 'n' || normalized === 'no' || normalized === 'false') {
    return false;
  }
  return undefined;
}

async function askQuestion(question) {
  const answer = await rl.question(question);
  if (containsInvalidCharacters(answer)) {
    throw new Error('Invalid input. The answer contains invalid characters.');
  }
  return answer;
}

async function askYesNoQuestion(question) {
  const answer = parseYesNo(await rl.question(question));
  if (answer === undefined) {
    throw new Error('Invalid input. Please provide a valid yes/no answer (Y/n).');
  }
  return answer;
}

function containsInvalidCharacters(input) {
  // Define the list of invalid characters or commands
  const invalidCharacters = [';', '|', '&&', '>', '<', '`', '$(', '$()'];
  // Check if the input contains any invalid characters or commands
  return invalidCharacters.some(character => input.includes(character));
}

run().catch((error) => {
  console.error(error.message);
  rl.close();
  process.exitCode = 1;
});

// Export the askQuestion function for testing purposes
export default { askQuestion };
