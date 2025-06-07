---
title: "Super Bomberman-Inspired Roblox Game: Part 1"
slug: "super-bomberman-inspired-roblox-game-part-1"
date: "2024-01-06"
---

This post continues the learning journal on game development, recording the first steps of working on a [Super Bomberman](https://en.wikipedia.org/wiki/Super_Bomberman?ref=terolaitinen.fi)-inspired game as I pivoted from [Unity](https://unity.com/?ref=terolaitinen.fi) to [Roblox Studio](https://create.roblox.com/?ref=terolaitinen.fi) with zero experience.

## Background

I [explained](https://terolaitinen.fi/minimal-physics-based-multiplayer-unity-game/#background) why Unity felt like the rational choice for a long-term commitment to game development. Since then, my boys, avid [Roblox](https://www.roblox.com/?ref=terolaitinen.fi) gamers, have preferred Roblox Studio, a platform for creating multiplayer online experiences.

I initially favored Unity because it lends itself to more varied games than Roblox Studio, and C# is a decent typed language with proper tooling and good performance. [Lua](https://www.lua.org/?ref=terolaitinen.fi) falls short in comparison. However, after witnessing my boys' budding interest in Roblox Studio, I matched my tools with theirs to support their aspirations more effectively. With Roblox Studio, publishing games is straightforward, and being able to play games on consoles is also a nice bonus.

## Scope

I wanted to create something simple enough to finish yet fun to play. I sought inspiration from an old SNES classic, [Super Bomberman](https://en.wikipedia.org/wiki/Super_Bomberman?ref=terolaitinen.fi), where up to four players try to blow each other up in a rectangular grid consisting of unbreakable and breakable walls, collecting power-ups to gain an edge.

![Screenshot from Super Bomberman](/images/2024/01/SNES_Super_Bomberman_-Battle_Mode-.png)

## Building Game Arena

The unbreakable part of the game arena consists of 29 anchored block Parts and four SpawnLocations.

![](/images/2024/01/Screenshot-2024-01-04-at-16.10.22.png)

To add breakable walls dynamically, ServerStorage contains a textured block Part, "BrickWall," serving as a template object. On startup, the Script "InitBrickWalls" under ServerScriptService fills some empty gaps in the arena with breakable "BrickWall" objects. The Script "InitBrickWalls" requires the ModuleScript "GameArea," which exports some coordinate utilities.

```lua
local GameArea = {}

GameArea.width = 13
GameArea.height = 9
GameArea.blockSize = 4
GameArea.halfBlockSize = GameArea.blockSize / 2
GameArea.xOffset = 2
GameArea.yOffset = 2.5
GameArea.zOffset = 2

local epsilon = 0.001

function GameArea.isUnbreakable(gx, gy)
	local isOutOfBounds = gx < 0 or gy < 0 or gx >= GameArea.width or gy >= GameArea.height 
	local isPermanentWall = gx % 2 == 1 and gy % 2 == 1
	return isOutOfBounds or isPermanentWall
end

function GameArea.vectorFromGridCoords(gx, gy) 
	return Vector3.new(
		GameArea.xOffset + gx * GameArea.blockSize,
		GameArea.yOffset,
		GameArea.zOffset + gy * GameArea.blockSize
	)
end

function GameArea.cframeFromGridCoords(gx, gy) 
	local v = GameArea.vectorFromGridCoords(gx, gy)
	return CFrame.new(v.X, v.Y, v.Z)
end

function GameArea.regionFromGridCoords(gx, gy) 
	local center = GameArea.vectorFromGridCoords(gx, gy)
	local halfSize = GameArea.halfBlockSize - epsilon
	local cornerVector = Vector3.new(halfSize, halfSize, halfSize)
	local corner1 = center - cornerVector
	local corner2 = center + cornerVector
	return Region3.new(corner1, corner2)
end

function GameArea.toGridCoords(x,z) 
	return {
		gx = math.floor((x - GameArea.xOffset) / GameArea.blockSize),
		gy = math.floor((z - GameArea.zOffset) / GameArea.blockSize)
	}
end

return GameArea
```

ServerScriptService/GameArea (ModuleScript)

The Script "InitBrickWalls" iterates over the squares in the game area, cloning "BrickWall" objects in most empty spaces. 

```lua
local brickWall = game.ServerStorage.BrickWall 
local GameArea = require(game.ServerScriptService.GameArea)
local wallProbability = 0.9 

for gx = 0, GameArea.width -1 do
	for gy = 0, GameArea.height - 1 do
		if GameArea.isUnbreakable(gx, gy) then
			continue
		end 
		if gx <= 1 and gy <= 1 then
			continue
		end
		if gx >= GameArea.width - 2 and gy <= 1 then
			continue
		end
		if gx >= GameArea.width - 2 and gy >= GameArea.height - 2 then
			continue
		end
		if gx <= 1 and gy >= GameArea.height - 2 then
			continue
		end
		if math.random() < wallProbability then
			local wall = brickWall:Clone()
			wall.Position = GameArea.vectorFromGridCoords(gx, gy)
			wall.Parent = game.Workspace 
		end
	end
end
```

ServerScriptService/InitBrickWalls (Script)

The script leaves the corners empty so players can maneuver and drop bombs without being caught in a blast.

![](/images/2024/01/Screenshot-2024-01-04-at-18.35.22.png)

## Disabling Jumping

The default controls allow player characters to jump over blocks. Setting StartPlayer.CharacterJumpHeight to zero turns off jumping.  

![](/images/2024/01/Screenshot-2024-01-06-at-17.22.15.png)

## Pointing Camera from Above

By default, the camera follows the player's character. Such a close-up view is unsuitable for the game.

![](/images/2024/01/Screenshot-2024-01-06-at-14.49.30.png)

By default, the camera follows the player's character.

The LocalScript "InitCamera" under StarterPlayerScripts changes the CameraType to Scriptable and connects a function to the RenderStepped event, which runs before rendering the frame. The function points the camera from a fixed location towards the area from above. 

```lua
local Camera = workspace.CurrentCamera
Camera.CameraType = Enum.CameraType.Scriptable

local fixedPosition = Vector3.new(26, 125, 54) 
local lookAtPosition = Vector3.new(26, 0, 18) 

game:GetService("RunService").RenderStepped:Connect(function()
	local cameraCFrame = CFrame.new(fixedPosition, lookAtPosition)
	Camera.CFrame = cameraCFrame
	Camera.FieldOfView = 20
end)
```

StarterPlayer/StarterPlayerScripts/InitCamera (LocalScript)

With the camera placed suitably in a fixed position, all players have the same view over the game arena.

![](/images/2024/01/Screenshot-2024-01-06-at-17.15.14.png)

## Bomb Fuse Animation

Players can drop bombs with a rudimentary animation, which indicates how quickly they will go off.

![](/images/2024/01/bomb-fuse.gif)

The template Model "Bomb" resides under ServerStorage, consisting of a sphere, two cylinders, a ParticleEmitter for sparks, a PointLight, and a transparent block "BombWall" to prevent characters from entering the square with a bomb. Without "BombWall", a character may sometimes warp to the other side of the bomb or climb on top of it.

![](/images/2024/01/Screenshot-2024-01-06-at-18.11.59.png)

The Script "RandomBrightness" randomly changes the PointLight's brightness contributing to the spark effect.

```lua
local pointLight = script.Parent 
local minBrightness = 10
local maxBrightness = 200
local changeSpeed = 0.05 

while true do
	pointLight.Brightness = math.random() * (maxBrightness - minBrightness) + minBrightness
	wait(changeSpeed)
end
```

ServerStorage/Bomb/Fuse/Fuse/Tip/PointLight/RandomBrightness (Script)

The Script "ShortenFuse" moves the fuse inside the sphere, giving the impression that the fuse is shortening.

```lua
local fuse = script.Parent
local changeSpeed = 0.1
for i = 1,15 do
	fuse:TranslateBy(Vector3.new(0, -0.15, 0))
	wait(changeSpeed)
end
```

ServerStorage/Bomb/Fuse/ShortenFuse (Script)

## Allowing Players to Drop Bombs

When a player wants to place a bomb in the square where their character is, they press the space bar. The LocalScript "PlayerInput" under PlayerStarterScripts binds a function to ContextActionService, which fires a server-side RemoteEvent "DropBombEvent." Before registering the function, the LocalScript waits for "DropBombEvent" to be replicated to the client using WaitForChild.

```lua
local dropBombEvent = game.ReplicatedStorage:WaitForChild("DropBombEvent")
local player = game.Players.LocalPlayer
local ContextActionService = game:GetService("ContextActionService")
local ACTION_DROP_BOMB = "DropBomb"

local function handleAction(actionName, inputState, _inputObject)
	if actionName == ACTION_DROP_BOMB and inputState == Enum.UserInputState.Begin then
		dropBombEvent:FireServer()	
	end
end
ContextActionService:BindAction(ACTION_DROP_BOMB, handleAction, true, Enum.KeyCode.Space)
```

StartPlayer/StarterPlayerScripts/PlayerInput (LocalScript)

The Script "HandleDropBomb" under ServerScriptService connects the "handleDropBomb" function to the "DropBombEvent" RemoteEvent. The function resolves the square the player's character is stepping on, clones the "Bomb" template Model to the center of the square, enables "BombWall"'s CanCollide when the character vacates the square, and creates an explosion after a delay.

```lua
local GameArea = require(game.ServerScriptService.GameArea)
local Explosion = require(game.ServerScriptService.Explosion)
local dropBombEvent = game.ReplicatedStorage.DropBombEvent
local bombTemplate = game.ServerStorage.Bomb
local EXPLODE_DELAY = 1.5

local function handleDropBomb(player)	
	local character = player.Character or player.CharacterAdded:Wait()
	local humanoidRootPart = character:WaitForChild("HumanoidRootPart")
	local bomb = bombTemplate:Clone()
	local gridCoords = GameArea.toGridCoords(humanoidRootPart.Position.X + GameArea.halfBlockSize, humanoidRootPart.Position.Z + GameArea.halfBlockSize)
	bomb:SetPrimaryPartCFrame(GameArea.cframeFromGridCoords(gridCoords.gx, gridCoords.gy))
	bomb.Parent = game.Workspace
	local bombWall = bomb:FindFirstChild("BombWall")
	local function handleBombWallTouchEnded(part)
		local partPlayer = game.Players:GetPlayerFromCharacter(part.Parent)
		if player == partPlayer then
			bombWall.CanCollide = true
		end
	end
	bombWall.TouchEnded:Connect(handleBombWallTouchEnded)
	wait(EXPLODE_DELAY)
	bomb:Destroy()
	Explosion.explode(gridCoords.gx, gridCoords.gy, 1)
end

dropBombEvent.OnServerEvent:Connect(handleDropBomb)
```

ServerScriptService/HandleDropBombEvent (Script)

After a delay, the Script "HandleBombEvent" destroys the "Bomb" object and creates an explosion using the "explode" method from the ModuleScript "Explosion."

```lua
local Explosion = {}
local GameArea = require(game.ServerScriptService.GameArea)
local explosionTemplate = game.ServerStorage.Explosion

local function destroyBrickWall(gx, gy)
	local region = GameArea.regionFromGridCoords(gx, gy)
	local parts = workspace:FindPartsInRegion3(region, nil, math.huge)
	for _, part in pairs(parts) do	
		if part:IsA("Part") and part.Name == "BrickWall" then
			part:Destroy()
		end
	end
end

function Explosion.createExplosion(gx, gy) 
	local explosion = explosionTemplate:Clone()
	explosion.Position = GameArea.vectorFromGridCoords(gx, gy)
	explosion.Parent = game.Workspace 
	destroyBrickWall(gx, gy)
end
	
function Explosion.explode(bombGx, bombGy, radius) 
	local directions = {
		{dx = 1, dy = 0, active = true},
		{dx = -1, dy = 0, active = true},
		{dx = 0, dy = 1, active = true},
		{dx = 0, dy = -1, active = true},
	}	
	Explosion.createExplosion(bombGx,bombGy)
	for i = 1, radius do
		for _, direction in pairs(directions) do
			local gx = bombGx + direction.dx * i
			local gy = bombGy + direction.dy * i
			if GameArea.isUnbreakable(gx, gy) or not direction.active then
				direction.active = false
				continue	
			end
			Explosion.createExplosion(gx, gy)
		end
		wait(0.25)
	end
end
return Explosion
```

ServerScriptService/Explosion (ModuleScript)

The "explode" function iterates over a plus-shaped region of squares, stopping at unbreakable walls, spawning built-in Explosions, and destroying affected "BrickWall" objects. The function finds "BrickWalls" using FindPartsInRegion3, which I now notice is deprecated.

## Conclusion

With that, I'm off to an encouraging start in my Roblox game development journey, being more able to support my boys' projects. There are still many critical features to add to the Bomberman-inspired game, like power-ups, starting battle rounds in a coordinated way, and scoring.

![](/images/2024/01/ezgif.com-optimize.gif)