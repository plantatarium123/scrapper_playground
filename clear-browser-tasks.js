import { exec as execCallback } from 'child_process'
import { promisify } from 'util'

const exec = promisify(execCallback) // Convert exec to a Promise-based function

export async function clearBrowserTasks() {
   const command = 'Stop-Process -Name "chrome"'
   try {
      // Run a terminal command (Example: listing files in a directory)
      try {
         const { stdout, stderr } = await exec(`powershell.exe -Command "${command}"`)
         if (stderr) console.error(`Error:\n${stderr}`)
      } catch (error) {
         console.error(`Exec error: ${error.message}`)
      }
   } catch {
      console.log('ERROR CLEARING CHROME')
   }
}

// clearBrowserTasks()
