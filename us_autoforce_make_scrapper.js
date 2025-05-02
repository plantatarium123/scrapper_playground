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
let currYearText = ''
let currMakeText = ''
let currModelText = ''
let currTrimText = ''
let currSizeText = ''

async function getPaths() {
   // Create progress bar instance

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

      const data = await readFile('output.json', 'utf-8')
      const json = JSON.parse(data)

      const startTime = Date.now()

      for (let index = 391; index < json.length; index++) {
         const loopStartTime = Date.now()
         const pElement = await driver.wait(
            until.elementIsVisible(await driver.findElement(By.xpath("//p[text()='Vehicle Year / Make / Model']"))),
            10000 // timeout in ms
         )

         await pElement.click()
         await driver.sleep(1000)

         const yearIndex = json[index].yearIndex
         const makeIndex = json[index].makeIndex
         const modelIndex = json[index].modelIndex
         const trimIndex = json[index].trimIndex
         const sizeIndex = json[index].sizeIndex

         console.log('Running parent index: ', index)
         console.log(`Year: ${yearIndex} Make: ${makeIndex} Model: ${modelIndex} Trim: ${trimIndex} Size: ${sizeIndex}`)

         await searchTirePath(driver, yearIndex, makeIndex, modelIndex, trimIndex, sizeIndex)
         await scrapeGBB(driver)

         const homeBtn = await driver.findElement(By.id('navHome'))
         await homeBtn.click()

         await driver.sleep(1000)

         const endTime = Date.now()
         const loopExecutionTime = endTime - loopStartTime
         const executionTime = endTime - startTime
         console.log('one loop done')
         console.log(`Loop Execution Time: ${loopExecutionTime / 1000} seconds`)
         console.log(`Current Execution Time: ${executionTime / 1000 / 60} mins`)
         console.log(`Estimated Execution Time: ${(loopExecutionTime * 338) / 1000 / 60} mins`)
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

async function searchTirePath(driver, yearIn, makeIn = 0, modelIn, trimIn, sizeIn) {
   const sizeDropDown = await driver.wait(
      until.elementLocated(By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Size')]")),
      10000
   )
   const yearDropDown = await driver.wait(
      until.elementLocated(By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Year')]")),
      10000
   )
   await yearDropDown.click()
   await driver.sleep(500)
   const yearOptions = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))
   await driver.sleep(500)
   currYearText = await yearOptions[yearIn].getText()
   await yearOptions[yearIn].click()
   await driver.sleep(500)

   const makeDropDown = await driver.wait(
      until.elementLocated(By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Make')]")),
      10000
   )
   await makeDropDown.click()
   await driver.sleep(500)
   const makeOptions = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))
   await driver.sleep(500)
   currMakeText = await makeOptions[makeIn].getText()
   await makeOptions[makeIn].click()
   await driver.sleep(500)

   const modelDropDown = await driver.wait(
      until.elementLocated(By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Model')]")),
      10000
   )
   await modelDropDown.click()
   await driver.sleep(500)
   const modelOptions = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))
   await driver.sleep(500)
   currModelText = await modelOptions[modelIn].getText()
   await modelOptions[modelIn].click()
   await driver.sleep(500)

   const trimDropDown = await driver.wait(
      until.elementLocated(By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Trim')]")),
      10000
   )
   await trimDropDown.click()
   await driver.sleep(500)
   const trimOptions = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))
   await driver.sleep(500)
   currTrimText = await trimOptions[trimIn].getText()
   await trimOptions[trimIn].click()
   await driver.sleep(500)

   //    const sizeDropDown = await driver.wait(
   //       until.elementLocated(By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Size')]")),
   //       10000
   //    )
   await sizeDropDown.click()
   await driver.sleep(500)
   const sizeOptions = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))
   await driver.sleep(500)
   currSizeText = await sizeOptions[sizeIn].getText()
   await sizeOptions[sizeIn].click()
   await driver.sleep(500)

   const searchBtn = await driver.findElement(By.id('btnTireSearch'))
   await searchBtn.click()
}

async function scrapeGBB(driver) {
   let tireDataGrid
   try {
      tireDataGrid = await driver.wait(until.elementLocated(By.id('gridCards')), 7000)
      console.log('found')
   } catch (error) {
      return
   }

   const tireCells = await tireDataGrid.findElements(By.css('.relative.w-full.block'))
   console.log(tireCells.length)

   //    const gbb = [tireCells[2], tireCells[1], tireCells[0]]

   const gbb = []
   for (let i of [2, 1, 0]) {
      if (tireCells[i]) gbb.push(tireCells[i])
   }
   const gbbDataArray = []
   for (const cell of gbb) {
      try {
         // 2. Find the element containing the tire size text inside each card
         const imgHolder = await cell.findElement(
            By.xpath(".//div[contains(@class, 'cursor-pointer') and contains(@class, 'flex-col')]")
         )

         console.log('grabbed the image holder')
         const imgElement = await imgHolder.findElement(By.xpath('.//img'))
         const sizeElement = await cell.findElement(By.css('.body-medium-regular-tight.text-darkblue'))
         const titleElement = await cell.findElement(By.css('.subtitle-large-bold-tight.text-darkblue'))
         const retailPriceElement = await cell.findElement(By.css('.body-medium-bold.text-darkblue.text-right'))
         const installedPriceElement = await cell.findElement(By.css('.body-medium-regular.text-right'))

         const imgAlt = await imgElement.getAttribute('alt')
         const tireSize = await sizeElement.getText()
         const tireTitle = await titleElement.getText()
         let retialPriceText = await retailPriceElement.getText()
         let installedPriceText = await installedPriceElement.getText()
         //  console.log('Tire Size:', tireSize)
         //  console.log('Tire Title:', tireTitle)
         //  console.log('Tire Retail Price:', retialPriceText)
         //  console.log('Tire Installed Price:', installedPriceText)
         //  console.log('Waiting 10 seconds')

         const retialPriceTextMatch = retialPriceText.match(/[\d.]+/)
         const retialPriceNumber = retialPriceTextMatch ? parseFloat(retialPriceTextMatch[0]) : 0.0
         const installedPriceTextMatch = installedPriceText.match(/[\d.]+/)
         const installedPriceNumber = installedPriceTextMatch ? parseFloat(installedPriceTextMatch[0]) : 0.0

         gbbDataArray.push({
            brand: imgAlt,
            size: tireSize,
            title: tireTitle,
            retailPrice: retialPriceNumber,
            installedPrice: installedPriceNumber,
         })

         //await driver.sleep(10000)
      } catch (err) {
         console.log('Could not extract tire size from a card:', err.message)
      }
   }

   const dataRow = {
      year: currYearText,
      make: currMakeText,
      model: currModelText,
      trim: currTrimText,
      size: currSizeText,
      good: gbbDataArray[0],
      better: gbbDataArray[1],
      best: gbbDataArray[2],
   }

   console.log(dataRow)

   // Step 1: Load existing data or start new
   let data = []
   const filename = 'Acura_GBB.json'
   if (existsSync(filename)) {
      const fileContent = await readFile(filename, 'utf-8')
      try {
         data = JSON.parse(fileContent)
      } catch (err) {
         console.error('Could not parse JSON file:', err.message)
         // Fallback: start fresh
         data = []
      }
   }

   // Step 2: Append new row
   data.push(dataRow)

   // Step 3: Save updated array back to file
   await writeFile(filename, JSON.stringify(data, null, 2), 'utf-8')
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
