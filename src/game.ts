import * as utils from '@dcl/ecs-scene-utils'

// adjust the following to change difficulty
const trophyHeight = 8
const gravityMultiplier = 0.1
const platformRate = 25 // how many updates per platform spawn

const platformBodies: CANNON.Body[] = []
const platforms: Entity[] = []

const fixedTimeStep: number = 1.0 / 60.0 // seconds
const maxSubSteps: number = 3

var time = 0 // timer for text messages

// Create text component
const canvas = new UICanvas()
const text = new UIText(canvas)
text.vAlign = "top"
text.hAlign = "center"
text.fontSize = 30

// Create trophy entity
const trophy = new Entity()
trophy.addComponent(new GLTFShape('assets/WizardStaff_01.glb'))
trophy.addComponent(new Transform({
        position: new Vector3(8, trophyHeight, 8)
    })
)
// victory is achieved once player interacts with the trophy
trophy.addComponent(
        new OnPointerDown(
            () => {
                victory()
            },
            {
                button: ActionButton.PRIMARY,
                hoverText: 'Interact',
                distance: 5
            }
        )
)
engine.addEntity(trophy)

// Setup world with physics
const world: CANNON.World = new CANNON.World()
world.gravity.set(0, -9.8*gravityMultiplier, 0)

// setup ground plane
const groundPhysicsMaterial = new CANNON.Material('groundMaterial')
const groundPhysicsContactMaterial = new CANNON.ContactMaterial(
    groundPhysicsMaterial,
    groundPhysicsMaterial,
    {
        friction: 0.5,
        restitution: 0.0
    }
)
world.addContactMaterial(groundPhysicsContactMaterial)
const groundBody: CANNON.Body = new CANNON.Body({
    mass: 0 // static
})
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2) // Reorient ground plane to be in the y-axis
const groundShape: CANNON.Plane = new CANNON.Plane()
groundBody.addShape(groundShape)
groundBody.material = groundPhysicsMaterial
world.addBody(groundBody)

// material for the platforms
const platformMaterial = new Material()
platformMaterial.albedoColor = Color3.Green()
platformMaterial.metallic = 0.1
platformMaterial.roughness = 0.8

/** restart game by removing all platforms and their bodies */
function restartGame(){
    text.value = "Game Over, restarting.."
    for (let i = 0; i < platforms.length; i++){
        engine.removeEntity(platforms[i])
    }
    for (let i = 0; i < platformBodies.length; i++){
        world.remove(platformBodies[i])
    }
    // time to 0 to reset text messages
    time = 0
}

/** create falling platforms and their bodies at specified coordinates*/
function spawnPlatform(x: number, y: number, z: number) {
    // create platform
    const platform = new Entity()
    platform.addComponent(new Transform({ position: new Vector3(x, y, z) }))
    let box = new BoxShape()
    // box.withCollisions = true
    platform.addComponent(box)

    // add trigger box to trigger game restart on collision
    let triggerBox = new utils.TriggerBoxShape()
    platform.addComponent(
        new utils.TriggerComponent(
            triggerBox, //shape
            {
                onCameraEnter :() => {
                    log('Collision')
                    restartGame()

                }
            }
        )
    )

    platform.addComponent(platformMaterial)

    var platformTransform = platform.getComponent(Transform)
    platformTransform.scale.x *= 4
    platformTransform.scale.z *= 4
    engine.addEntity(platform)

    // create platform body
    const platformBody: CANNON.Body = new CANNON.Body({
    mass: 10, // kg
    position: new CANNON.Vec3(
        platformTransform.position.x,
        platformTransform.position.y,
        platformTransform.position.z
    ),
    // shape: new CANNON.Box(new CANNON.Vec3(1, 0.5, 1)) // box shape causes issues
      shape: new CANNON.Sphere(0.5) // treat platforms as a point mass
    })
    world.addBody(platformBody)

    // keep track of spawned platforms and their bodies
    platforms.push(platform)
    platformBodies.push(platformBody)

    return platform
}

/** display victory message */
function victory(){
    text.value = "Congratulations, you win!"
    // something should happen once player wins (Stop game, restart, victory screen, etc.)
}

/** update system */
class updateSystem implements ISystem {
    update(dt: number): void {
        time++
        // text messages for the player
        if (time == 100){
            text.value = "Grab the Staff at the top"
        }
        else if (time == 300){
            text.value = "Avoid the falling platforms"
        }
        else if (time == 500){
            text.value = ""
        }

        // single step of simulation
        world.step(fixedTimeStep, dt, maxSubSteps)

        // position platforms to match their CANNON.Body equivalents
        for (let i = 0; i < platforms.length; i++) {
            platforms[i].getComponent(Transform).position.copyFrom(platformBodies[i].position)
        }

        // incrementally spawn platforms to drop
        if (time%platformRate == 0){
            const xcoord = Math.floor(Math.random()*4) *4 +2 // align to grid
            const zcoord = Math.floor(Math.random()*4) *4 +2 // align to grid
            spawnPlatform(xcoord, 3*trophyHeight, zcoord )
        }
    }
}

engine.addSystem(new updateSystem())