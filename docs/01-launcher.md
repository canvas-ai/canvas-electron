Lets design a Context launcher UI for our canvas electron app with the following features
Note, 
Context is like a session, every application bound to it will follow its changes/
If a context "work" switches from context url customer://devops/jira-1234 to customer://ops/inc/snow-1234, every bound application reloads all data related to that 

Config should use Conf and use a platform dependend path

const homeDir = os.homedir();
if (process.platform === 'win32') {
    return path.join(homeDir, 'Canvas');
} else {
    return path.join(homeDir, '.canvas');
}

const configDir = homeDir/config/electron.json

First, lets start with the window
- Our context launcher will launch/hide with ctrl+space(default, configurable)
- Windows should be frameless, borderless and on top of all other windows
- Window size should be lets say 800x600
- Ideally if we could make it transparent and blur the background behind the window on all 3 platforms(electron --enable-transparent-visuals will do for linux)

