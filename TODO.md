[electron]
Initial setup (if no ./user/config/canvas-electron.json for portable setup or $HOME/config/canvas-electron.json exists)

Configure your primary canvas server runtime 
- Connect to an existing canvas-server instance
- Run canvas-server locally in-process(Closing or terminating canvas will also shutdown canvas-server)
- Run canvas-server locally as a separate process(pm2, Closing or terminating canvas will keep the server available for other application, you can manage the runtime using the "canvas" utility"

=> 
canvas.url (proto://ip:port)

auth: Username and Password || API Token
canvas.username
canvas.password
||
canvas.api-token

You can still open remote workspaces, contexts or canvases by simply adding them with 
proto://canvas-server.address:port/users/user.id/workspaces/workspace.id
proto://canvas-server.address:port/users/user.id/contexts/context.id
proto://canvas-server.address:port/users/user.id/canvases/tv

For example
https://canvas.idnc.sk/users/me@idnc.sk/workspaces/pub

