const inquirer = require('inquirer');
const apiService = require('./apiService');
const API_URL = '';
const MAZE_WH_MIN_VALUE = 15;
const MAZE_WH_MAX_VALUE = 25;

/** Messages */
const EXIT_MSG = 'PRESS CTRL+C TO EXIT';
const GOODBYE_MSG = 'See Ya!';
const EMPTY_INPUT_MSG = 'The value can´t be empty';
const NOT_INTEGER_MSG = 'The value must to be an integer';
const WIDTH_HEIGHT_LENGTH_MSG = `The value must to be greater than or equal to 15 and less than or equal to 25`;

let currentMazeId = null;
let currentMazeState = {};
main();

function main(avoidClear) {
    if(!avoidClear)
        clearScreen();
    inquirer.prompt([
        {
            type: 'list',
            name: 'options',
            message: 'Select an option',
            choices: [
                { name: 'Start a new game', value: 1 },
                { name: 'Exit', value: 2 },
            ],
        },
    ])
        .then(res => {
            switch (res.options) {
                case 1:
                    clearScreen();
                    startGame();
                    break;
                case 2:
                    exit()
                    break;
                default:
                    break;
            }
        })
        .catch(err => handleError(err));
}

function clearScreen() {
    console.log('\033[2J');
}

/**
 * Exit from the game.
 */
function exit() {
    console.info(GOODBYE_MSG);
    process.exit();
}

/**
 * Handle Game errors.
 * @param {Object} err - System error
 */
function handleError(err) {
    console.error(err);
    console.info(EXIT_MSG);
}


let widthHeightValidator =
    /**
     * Validate a width and height maze dimensions
     * @param {Number} value - value to validate
     */
    function widthHeightValidator(value) {
        const auxValue = Number(value);
        if (Number.isInteger(auxValue) && auxValue >= MAZE_WH_MIN_VALUE && auxValue <= MAZE_WH_MAX_VALUE)
            return true;
        else {
            if (!Number.isInteger(auxValue))
                return NOT_INTEGER_MSG;
            if (!(auxValue >= MAZE_WH_MIN_VALUE) || !(auxValue <= MAZE_WH_MAX_VALUE))
                return WIDTH_HEIGHT_LENGTH_MSG;
        }
    }

async function startGame() {
    let starterOptions;
    try {
        const res1 = await inquirer.prompt([
            {
                type: 'input',
                name: 'mazeWidth',
                message: 'Input maze width:',
                validate: widthHeightValidator,
            },
            {
                type: 'input',
                name: 'mazeHeight',
                message: 'Input maze height:',
                validate: widthHeightValidator,
            }
        ]);
        starterOptions = { mazeWidth: Number(res1.mazeWidth), mazeHeight: Number(res1.mazeHeight) };
        (function playerNameQuestion(validName) {
            if (!validName) {
                inquirer.prompt([
                    {
                        type: 'input',
                        name: 'mazePlayerName',
                        message: 'Input a valid pony player name (eg: Pinkie Pie):',
                        validate: value => {
                            let pass = value.length > 0;
                            if (pass) {
                                return true;
                            } else {
                                return EMPTY_INPUT_MSG;
                            };
                        }
                    }
                ])
                    .then(res2 => {
                        starterOptions.mazePlayerName = res2.mazePlayerName;
                        return apiService.createNewMaze(starterOptions);
                    })
                    .then(data => {
                        currentMazeId = data.maze_id;
                        playerNameQuestion(true);
                    })
                    .catch(err => {
                        console.error(err);
                        playerNameQuestion(false);
                    });
            } else {
                apiService.getMazeCurrentState(currentMazeId)
                    .then(res => {
                        currentMazeState = res;
                        return printMaze(currentMazeId);
                    })
                    .then(data => {
                        showStartedGameOptions();
                    })
                    .catch(err => handleError(err))
            }

        })(false)


    } catch (err) {
        console.error(err);
    }

}

function showStartedGameOptions() {
    inquirer.prompt([
        {
            type: 'list',
            name: 'options',
            message: 'Select an option',
            choices: [
                { name: 'Print maze', value: 1 },
                { name: 'Move', value: 2 },
                { name: 'Exit', value: 3 },
            ],
        },
    ])
        .then(options => {
            switch (options.options) {
                case 1:
                    printMaze()
                        .then(data => showStartedGameOptions());
                    break;
                case 2:
                    move();
                    break;
                case 3:
                    main();
                    break;
                default:
                    break;
            }
        })
}

async function printMaze(mazeId) {
    try {
        let data = await apiService.printMaze(currentMazeId);
        console.log(data);
        console.log('Current game state: ' + currentMazeState['game-state'].state);
        return Promise.resolve(data);
    }
    catch (err) {
        return Promise.reject(err)
    }
}

async function move() {
    const MAZE_WIDTH = currentMazeState.size[0];
    const CURRENT_PONY_POSITION = currentMazeState.pony[0];
    let positionOptions = [];
    let currentPositionWalls = currentMazeState.data[CURRENT_PONY_POSITION];
    let rightPositionWalls = currentMazeState.data[CURRENT_PONY_POSITION + 1] || ['west'];
    let downPositionWalls =  currentMazeState.data[CURRENT_PONY_POSITION + MAZE_WIDTH];
    
    try {
    let positionAvailables = getWalkableDirections(currentPositionWalls, rightPositionWalls, downPositionWalls);

    for (let i = 0; i < positionAvailables.length; i++) {
        let name;
        let auxOption = {
            value: positionAvailables[i],
        };
        switch (positionAvailables[i]) {
            case 'north':
                name = 'North ▲';
                break;
            case 'south':
                name = 'South ▼';
                break;
            case 'east':
                name = 'East ►';
                break;
            case 'west':
                name = 'West ◄';
                break;
            default:
                break;
        }
        auxOption.name = name;
        positionOptions.push(auxOption);
    }

    positionOptions.push({ name: 'Cancel', value: 'cancel' });
    
        let res = await inquirer.prompt([
            {
                type: 'list',
                name: 'options',
                message: 'Where do you want to move?',
                choices: positionOptions,
            },
        ]);
        if (res.options === 'cancel') {
            clearScreen();
            await printMaze();
            showStartedGameOptions();
        } else {
            let apiResponse = await apiService.move(currentMazeId, res.options);
            currentMazeState = await apiService.getMazeCurrentState(currentMazeId);
            await printMaze();
            console.log(apiResponse['state-result']);
            if (currentMazeState['game-state'].state === 'active') {
                move();
            } else {
               main(true);
            }
        }
    } catch (error) {
        console.error(error);
    }
}

/**
 * Get the walkables directions of an actual position.
 * @param {Array} actualPosition - current pony position walls
 * @param {Array} rightPosition  - current pony position + 1 walls
 * @param {Array} downPosition - below of current pony position walls
 */
function getWalkableDirections(actualPosition, rightPosition, downPosition = ['north']) {
    let positionAvailables = ['north', 'south', 'east', 'west'];
    for (let i = 0; i < actualPosition.length; i++) {
        let index = positionAvailables.indexOf(actualPosition[i]);
        if (index > -1)
            positionAvailables.splice(index, 1);
    }
    for (let i = 0; i < rightPosition.length; i++) {
        if (rightPosition[i] === 'west') {
            let index = positionAvailables.indexOf('east');
            if (index > -1)
                positionAvailables.splice(index, 1);
        }
    }
    for (let i = 0; i < downPosition.length; i++) {
        if (downPosition[i] === 'north') {
            let index = positionAvailables.indexOf('south');
            if (index > -1)
                positionAvailables.splice(index, 1);
        }
    }

    return positionAvailables;
}