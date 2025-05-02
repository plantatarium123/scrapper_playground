import { Builder, By, until } from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome.js'
import fs from 'fs/promises'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import cliProgress from 'cli-progress' // Import progress bar package

import {
   carBrands,
   checkAndClickDealerButton,
   selectDropdown,
   getDropdownOptions,
   getPricingData,
   getFeaturesList,
   getBenefitsList,
   getSpecData,
   getTireTitle,
   slowClick,
   appendJsonToFile,
   getMakeYears,
   getTotalPaths,
   getBrandSrc,
} from './get-data-functions.js'
import { clearBrowserTasks } from './clear-browser-tasks.js'
import { setTimeout } from 'timers/promises'

let attempts = 0
let totalNumItems = 0

// setInterval(() => {
//    console.log('Restarting browser after 2 mins...')
// }, 3600000) // Every 30 mins 1800000 600000 === 10 mins

let currentTireTitle = ''

async function getPaths() {
   // Create progress bar instance

   let yearIndex = 31
   let makeIndex = 0
   let modelIndex = 1
   let trimIndex = 2
   let sizeIndex = 0

   let options = new chrome.Options()
   options.addArguments('--log-level=3') // Suppress logs (errors only)
   options.addArguments('--disable-gpu') // Avoid GPU-related warnings
   options.addArguments('--disable-extensions') // Avoid extension errors
   options.addArguments('--disable-dev-shm-usage') // Prevent /dev/shm errors in Linux
   options.addArguments('--no-sandbox') // Prevent sandbox errors
   //options.addArguments('--start-maximized') // Prevent sandbox errors

   let driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options) // 🚀 FIX: Disable Chrome sandbox
      .build()

   //await driver.manage().window().setRect({ x: -1090, y: 0, width: 1100, height: 1920 })
   await driver.manage().window().setRect({ x: 2560, y: 0, width: 1920, height: 1300 })

   try {
      // ✅ Navigate to the correct page
      await driver.get('https://shop.usautoforce.com/Account/Login')
      await driver.sleep(5000) // 🛑 Pause to observe the page load

      // ✅ Wait for the dropdown to appear
      await driver.wait(until.elementLocated(By.id('userName')), 1000)

      const usernameInput = await driver.findElement(By.id('userName'))
      await usernameInput.clear()
      await usernameInput.sendKeys('derek.dimke@leftlaneautollc.com')

      const passwordInput = await driver.findElement(By.id('password'))
      await passwordInput.clear()
      await passwordInput.sendKeys('Testaccount1!')

      const loginBtn = await driver.findElement(By.id('login'))
      await loginBtn.click()

      await driver.sleep(5000)

      const pElement = await driver.findElement(By.xpath("//p[text()='Vehicle Year / Make / Model']"))
      pElement.click()

      await driver.sleep(5000)

      const yearDropDown = await driver.wait(
         until.elementLocated(By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Year')]")),
         10000
      )
      await yearDropDown.click()
      await driver.sleep(1000)
      const yearOptions = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))
      const yearOptionsLength = yearOptions.length
      console.log(yearOptionsLength)
      await yearDropDown.click()
      console.log('yearDropDown should be reset')
      await driver.sleep(1000)

      let year = 'Select Year'
      let make = 'Select Make'
      let model = 'Select Model'
      let trim = 'Select Trim'

      for (let i = yearIndex; i < yearOptionsLength; i++) {
         //console.log('going through year for loop')
         //  const yearDropDownRenew = await driver.wait(
         //     until.elementLocated(
         //        By.xpath(`//span[contains(@class, 'telerik-blazor') and contains(normalize-space(.), '${year}')]`)
         //     ),
         //     10000
         //  )
         const yearDropDownRenew = await driver.wait(
            until.elementIsVisible(
               await driver.findElement(
                  By.xpath(`//span[contains(@class, 'telerik-blazor') and contains(normalize-space(.), '${year}')]`)
               )
            ),
            10000
         )

         await yearDropDownRenew.click()
         //console.log('yeardropdownrenew clicked, options should appear')
         await driver.sleep(1000)
         const yearOptionsRenew = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))
         year = await yearOptionsRenew[i].getText()
         await yearOptionsRenew[i].click()
         await driver.sleep(1000)

         const makeDropDown = await driver.wait(
            until.elementLocated(By.xpath(`//span[contains(@class, 'telerik-blazor') and contains(., '${make}')]`)),
            10000
         )
         await makeDropDown.click()
         await driver.sleep(1000)
         const makeOptions = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))
         make = await makeOptions[0].getText()
         if (make !== 'Acura') {
            make = 'Select Make'
            continue
         }
         await makeOptions[0].click()
         await driver.sleep(1000)

         const modelDropDown = await driver.wait(
            until.elementLocated(By.xpath(`//span[contains(@class, 'telerik-blazor') and contains(., '${model}')]`)),
            10000
         )
         await modelDropDown.click()
         await driver.sleep(1000)
         const modelOptions = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))
         await modelDropDown.click()
         await driver.sleep(1000)

         for (let x = modelIndex; x < modelOptions.length; x++) {
            const modelDropDownRenew = await driver.wait(
               until.elementLocated(By.xpath(`//span[contains(@class, 'telerik-blazor') and contains(., '${model}')]`)),
               10000
            )
            await modelDropDownRenew.click()
            await driver.sleep(1000)
            const modelOptionsRenew = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))
            model = await modelOptionsRenew[x].getText()
            await modelOptionsRenew[x].click()
            await driver.sleep(1000)

            const trimDropDown = await driver.wait(
               until.elementLocated(By.xpath(`//span[contains(@class, 'telerik-blazor') and contains(., '${trim}')]`)),
               10000
            )
            await trimDropDown.click()
            await driver.sleep(1000)
            const trimOptions = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))
            await trimDropDown.click()
            await driver.sleep(1000)

            for (let y = trimIndex; y < trimOptions.length; y++) {
               const trimDropDownRenew = await driver.wait(
                  until.elementLocated(
                     By.xpath(`//span[contains(@class, 'telerik-blazor') and contains(., '${trim}')]`)
                  ),
                  10000
               )
               await trimDropDownRenew.click()
               await driver.sleep(1000)
               const trimOptionsRenew = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))

               if (y === trimOptionsRenew.length - 1) continue
               trim = await trimOptionsRenew[y].getText()
               await trimOptionsRenew[y].click()
               await driver.sleep(1000)

               try {
                  const sizeDropDown = await driver.wait(
                     until.elementLocated(
                        By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Size')]")
                     ),
                     3000
                  )
                  await sizeDropDown.click()
                  await driver.sleep(1000)
                  const sizeOptions = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))

                  for (let z = 0; z < sizeOptions.length; z++) {
                     await savePathToFile(i, x, y, z)
                  }
               } catch (error) {
                  console.log('only one size avaiable, saving size 0 to file')
                  await savePathToFile(i, x, y, 0)
                  continue
               }
            }
            trim = 'Select Trim'
         }
         //year = 'Select Year'
         make = 'Select Make'
         model = 'Select Model'
      }

      //   const yearDropDown = await driver.findElement(

      await driver.sleep(10000)
      await driver.quit()

      return Promise.resolve({
         reason: `complete`,
      })
   } catch (err) {
      console.log('SOMETHING WENT WRONG: ', err)
      await driver.quit()

      return Promise.reject({
         reason: err,
      })
   }
}

async function savePathToFile(i, x, y, z) {
   const filename = 'output.json'
   const path = {
      yearIndex: i,
      makeIndex: 0,
      modelIndex: x,
      trimIndex: y,
      sizeIndex: z,
   }

   // Read existing or initialize empty
   let existing = []
   if (existsSync(filename)) {
      const content = await readFile(filename, 'utf-8')
      existing = JSON.parse(content)
   }

   existing.push(path)

   await writeFile(filename, JSON.stringify(existing, null, 2), 'utf-8')
}

async function getFullPath(yearIn, makeIn = 0, modelIn, trimIn, sizeIn) {
   const yearDropDown = await driver.wait(
      until.elementLocated(By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Year')]")),
      10000
   )
   await yearDropDown.click()
   const yearOptions = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))
   await yearOptions[yearIn].click()

   const makeDropDown = await driver.wait(
      until.elementLocated(By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Make')]")),
      10000
   )
   await makeDropDown.click()
   const makeOptions = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))
   await makeOptions[makeIn].click()

   const modelDropDown = await driver.wait(
      until.elementLocated(By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Model')]")),
      10000
   )
   await modelDropDown.click()
   const modelOptions = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))
   await modelOptions[modelIn].click()

   const trimDropDown = await driver.wait(
      until.elementLocated(By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Trim')]")),
      10000
   )
   await trimDropDown.click()
   const trimOptions = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))
   await trimOptions[trimIn].click()
}

const startTime = Date.now()
async function parallelRun() {
   console.log('running function')
   const urls = [
      'https://example.com/page1',
      'https://example.com/page2',
      'https://example.com/page3',
      'https://example.com/page4',
   ]

   await getPaths()

   const endTime = Date.now()
   const executionTime = endTime - startTime
   console.log('Scraping completed!')
   console.log(`Total Execution Time: ${executionTime / 1000 / 60} mins`)
}

parallelRun()
