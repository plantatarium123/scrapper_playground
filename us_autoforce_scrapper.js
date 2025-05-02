import { Builder, By, until } from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome.js'
import fs from 'fs/promises'
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

async function scrapOneBrand() {
   // Create progress bar instance

   let yearIndex = 0
   let makeIndex = 0
   let modelIndex = 0
   let trimIndex = 0
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
   await driver.manage().window().setRect({ x: 0, y: 0, width: 2160, height: 1920 })

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

      //   const yearDropDown = await driver.findElement(
      //      By.xpath("//span[contains(normalize-space(text()), 'Select Year') and contains(@class, 'k-input-value-text')]")
      //   )
      const yearDropDown = await driver.wait(
         until.elementLocated(By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Year')]")),
         10000
      )
      await yearDropDown.click()
      // Wait for the options to load
      await driver.wait(until.elementsLocated(By.xpath("//ul[@role='listbox']//li[@role='option']")), 5000)

      const html = await driver.getPageSource()
      await fs.writeFile('after-dropdown.html', html)

      await driver.sleep(300)

      const yearOptions = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))

      const years = []

      for (const option of yearOptions) {
         const text = await option.getText()
         years.push(text.trim())
      }

      console.log('Year options:', years)

      await yearDropDown.click()

      console.log('done, drop down should be in starting position')

      await driver.sleep(10000)
      for (let i = 0; i < yearOptions.length; i++) {
         const yearDropDown = await driver.wait(
            until.elementLocated(By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Year')]")),
            10000
         )
         await yearDropDown.click()

         // this is the start of what i need to replicate
         // pulls the year options after dropdown clicked
         const yearOptionsRenew = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))
         // selects the correct year
         await yearOptionsRenew[yearIndex].click()

         const makeDropDown = await driver.wait(
            until.elementLocated(By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Make')]")),
            10000
         )
         await makeDropDown.click()
         // Wait for the options to load
         await driver.wait(until.elementsLocated(By.xpath("//ul[@role='listbox']//li[@role='option']")), 5000)
         await driver.sleep(300)

         const makeOptions = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))

         for (let i = 0; i < makeOptions.length; i++) {
            const makeOptionsRenew = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))
            await makeOptionsRenew[makeIndexIndex].click()

            const modelDropDown = await driver.wait(
               until.elementLocated(
                  By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Model')]")
               ),
               10000
            )
            await modelDropDown.click()
            // Wait for the options to load
            await driver.wait(until.elementsLocated(By.xpath("//ul[@role='listbox']//li[@role='option']")), 5000)
            await driver.sleep(300)

            const modelOptions = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))

            for (let i = 0; i < modelOptions.length; i++) {
               const modelOptionsRenew = await driver.findElements(
                  By.xpath("//ul[@role='listbox']//li[@role='option']")
               )
               await modelOptionsRenew[modelIndex].click()

               const trimDropDown = await driver.wait(
                  until.elementLocated(
                     By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Trim')]")
                  ),
                  10000
               )
               await trimDropDown.click()
               // Wait for the options to load
               await driver.wait(until.elementsLocated(By.xpath("//ul[@role='listbox']//li[@role='option']")), 5000)
               await driver.sleep(300)

               const trimOptions = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))

               for (let i = 0; i < trimOptions.length; i++) {
                  const trimOptionsRenew = await driver.findElements(
                     By.xpath("//ul[@role='listbox']//li[@role='option']")
                  )
                  await trimOptionsRenew[trimIndex].click()

                  const sizeDropDown = await driver.wait(
                     until.elementLocated(
                        By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Size')]")
                     ),
                     10000
                  )
                  await sizeDropDown.click()
                  // Wait for the options to load
                  await driver.wait(until.elementsLocated(By.xpath("//ul[@role='listbox']//li[@role='option']")), 5000)
                  await driver.sleep(300)

                  const sizeOptions = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))
               }
            }

            //  const makeDropDown = await driver.wait(
            //     until.elementLocated(By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Make')]")),
            //     10000
            //  )
            //  await makeDropDown.click()

            await driver.sleep(10000)
         }

         //  const makeDropDown = await driver.wait(
         //     until.elementLocated(By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Make')]")),
         //     10000
         //  )
         //  await makeDropDown.click()

         await driver.sleep(10000)
      }

      //   const yearElement = await driver.wait(until.elementLocated(By.xpath("//*[contains(text(), '2025')]")), 5000)

      //   await yearElement.click()
      await driver.sleep(20000)

      return Promise.resolve({
         reason: `complete`,
      })
   } catch (err) {
      console.log('SOMETHING WENT WRONG: ', err)

      //await appendJsonToFile(tireData)
      //progressBar.stop() // Stop progress bar when bot completes
      await driver.quit()

      return Promise.reject({
         reason: err,
      })
   }
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

   await scrapOneBrand()

   const endTime = Date.now()
   const executionTime = endTime - startTime
   console.log('Scraping completed!')
   console.log(`Total Execution Time: ${executionTime / 1000 / 60} mins`)
}

// async function selectDropdown(driver, dropdownId, optionToSelect) {
//    let dropdown = await driver.findElement(By.id(dropdownId))
//    await slowClick(dropdown, driver)
//    await driver.wait(until.elementLocated(By.css(`option[value="${optionToSelect}"]`)), 3000)
//    let option = await driver.findElement(By.css(`option[value="${optionToSelect}"]`))
//    await slowClick(option, driver)
// }

// async function getDropdownOptions(driver, selectID) {
//    try {
//       let dropdown = await driver.findElement(By.id(selectID))
//       await driver.sleep(500)

//       let options = await dropdown.findElements(By.css('option'))
//       //await driver.sleep(500)

//       let values = []
//       for (let option of options) {
//          let value = await option.getAttribute('value')
//          let text = await option.getText()
//          if (value) values.push({ value, text }) // Skip empty values
//       }

//       return values
//    } catch (error) {
//       console.error(`Error fetching options from ${selectID}:`, error)
//       return []
//    }
// }

// // ✅ Slow Click Helper Function (Customizable Delay)
// async function slowClick(element, driver, delay = 300) {
//    try {
//       await driver.wait(until.elementIsVisible(element), 3000)
//       await element.click()
//    } catch (err) {
//       // console.error('Error clicking element:', err)
//       // let parentHTML = await driver.executeScript('return arguments[0].outerHTML;', [tempElem])
//       // console.log('parentHTML: ', parentHTML)
//       // await fs.writeFile('elem.html', parentHTML, 'utf8')
//    }
// }

parallelRun()
