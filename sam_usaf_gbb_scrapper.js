import { Builder, By, until } from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome.js'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import fs from 'fs/promises'

let currentTireTitle = ''
let currYearText = ''
let currMakeText = ''
let currModelText = ''
let currTrimText = ''
let currSizeText = ''

async function getGBB(year, make, model, trim, size) {
   // Create progress bar instance

   let options = new chrome.Options()
   options.addArguments('--log-level=3') // Suppress logs (errors only)
   options.addArguments('--disable-gpu') // Avoid GPU-related warnings
   options.addArguments('--disable-extensions') // Avoid extension errors
   options.addArguments('--disable-dev-shm-usage') // Prevent /dev/shm errors in Linux
   options.addArguments('--no-sandbox') // Prevent sandbox errors
   options.addArguments('--headless')
   options.addArguments('--window-size=1920,1080') // 👈 set desired size
   //options.addArguments('--start-maximized') // Prevent sandbox errors

   let driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options) // 🚀 FIX: Disable Chrome sandbox
      .build()

   //await driver.manage().window().setRect({ x: -1090, y: 0, width: 1100, height: 1920 })
   //await driver.manage().window().setRect({ x: 2560, y: 0, width: 1920, height: 1080 })

   try {
      // ✅ Navigate to the correct page
      await driver.get('https://shop.usautoforce.com/Account/Login')
      //await driver.sleep(5000) // 🛑 Pause to observe the page load

      const currentUrl = await driver.getCurrentUrl()

      // ✅ Wait for the dropdown to appear
      await driver.wait(until.elementLocated(By.id('userName')), 5000)

      const usernameInput = await driver.findElement(By.id('userName'))
      await usernameInput.clear()
      await usernameInput.sendKeys('derek.dimke@leftlaneautollc.com')

      const passwordInput = await driver.findElement(By.id('password'))
      await passwordInput.clear()
      await passwordInput.sendKeys('Testaccount1!')

      const loginBtn = await driver.findElement(By.id('login'))
      await loginBtn.click()

      await driver.wait(async () => {
         const newUrl = await driver.getCurrentUrl()
         //console.log('HERE')
         //console.log(newUrl)
         //console.log(currentUrl)
         return newUrl !== currentUrl
      }, 10000)

      await searchTirePath(driver, year, make, model, trim, size)
      const { gbb, fullSetOfTireData } = await scrapeGBB(driver)
      //console.log('GBB: ', gbb)
      //console.log('fullSetOfTireData: ', fullSetOfTireData)

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

async function searchTirePath(driver, year, make, model, trim, size) {
   //    const searchForProdBtn = await driver.wait(
   //       until.elementLocated(By.xpath("//button[text()='Search for Products']")),
   //       10000 // timeout in ms
   //    )

   //    await searchForProdBtn.click()

   //    await driver.sleep(3000)

   const pElement = await driver.wait(
      until.elementLocated(By.xpath("//p[text()='Vehicle Year / Make / Model']")),
      10000 // timeout in ms
   )

   await pElement.click()

   //await driver.sleep(5000)
   const sizeDropDown = await driver.wait(
      until.elementLocated(By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Size')]")),
      10000
   )
   const yearDropDown = await driver.wait(
      until.elementLocated(By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Year')]")),
      10000
   )

   const makeDropDown = await driver.wait(
      until.elementLocated(By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Make')]")),
      10000
   )

   const modelDropDown = await driver.wait(
      until.elementLocated(By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Model')]")),
      10000
   )

   const trimDropDown = await driver.wait(
      until.elementLocated(By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Trim')]")),
      10000
   )

   await driver.wait(until.elementIsVisible(yearDropDown), 5000)
   await driver.wait(until.elementIsEnabled(yearDropDown), 5000)

   await yearDropDown.click()
   await waitForAllOptions(driver, 'Select Year')
   const yearOptions = await driver.findElements(By.xpath("//ul[@aria-label='Select Year']//li[@role='option']"))
   await selectOptionFromDropdown(yearOptions, year)

   await makeDropDown.click()
   await waitForAllOptions(driver, 'Select Make')
   const makeOptions = await driver.findElements(By.xpath("//ul[@aria-label='Select Make']//li[@role='option']"))
   await selectOptionFromDropdown(makeOptions, make)

   await modelDropDown.click()
   await waitForAllOptions(driver, 'Select Model')
   const modelOptions = await driver.findElements(By.xpath("//ul[@aria-label='Select Model']//li[@role='option']"))
   await selectOptionFromDropdown(modelOptions, model)

   await trimDropDown.click()
   await waitForAllOptions(driver, 'Select Trim')
   const trimOptions = await driver.findElements(By.xpath("//ul[@aria-label='Select Trim']//li[@role='option']"))
   await selectOptionFromDropdown(trimOptions, trim)

   await sizeDropDown.click()
   await waitForAllOptions(driver, 'Select Size')
   const sizeOptions = await driver.findElements(By.xpath("//ul[@aria-label='Select Size']//li[@role='option']"))
   await selectOptionFromDropdown(sizeOptions, size)

   const searchBtn = await driver.findElement(By.id('btnTireSearch'))
   await driver.wait(until.elementIsVisible(searchBtn), 10000)
   await driver.wait(until.elementIsEnabled(searchBtn), 10000)
   await searchBtn.click()

   //await driver.sleep(15000)

   return 'done'
}

async function waitForAllOptions(driver, ariaLabelText) {
   let lastCount = 0
   let stableCount = 0

   while (stableCount < 3) {
      const options = await driver.findElements(By.xpath(`//ul[@aria-label='${ariaLabelText}']//li[@role='option']`))
      if (options.length === lastCount) {
         stableCount++
      } else {
         stableCount = 0
         lastCount = options.length
      }
      await driver.sleep(100)
   }
}

async function selectOptionFromDropdown(optionsList, optionToSelect) {
   //console.log('optionToSelect: ', optionToSelect)
   for (const option of optionsList) {
      const text = await option.getText()
      //console.log('checking if this option: ', text)
      if (text.trim().includes(optionToSelect)) {
         await option.click()
         break
      }
   }
}

// async function searchTirePathTemp(driver, yearIn, makeIn = 0, modelIn, trimIn, sizeIn) {
//    const sizeDropDown = await driver.wait(
//       until.elementLocated(By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Size')]")),
//       10000
//    )
//    const yearDropDown = await driver.wait(
//       until.elementLocated(By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Year')]")),
//       10000
//    )
//    await yearDropDown.click()
//    await driver.sleep(500)
//    const yearOptions = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))
//    await driver.sleep(500)
//    currYearText = await yearOptions[yearIn].getText()
//    await yearOptions[yearIn].click()
//    await driver.sleep(500)

//    const makeDropDown = await driver.wait(
//       until.elementLocated(By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Make')]")),
//       10000
//    )
//    await makeDropDown.click()
//    await driver.sleep(500)
//    const makeOptions = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))
//    await driver.sleep(500)
//    currMakeText = await makeOptions[makeIn].getText()
//    await makeOptions[makeIn].click()
//    await driver.sleep(500)

//    const modelDropDown = await driver.wait(
//       until.elementLocated(By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Model')]")),
//       10000
//    )
//    await modelDropDown.click()
//    await driver.sleep(500)
//    const modelOptions = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))
//    await driver.sleep(500)
//    currModelText = await modelOptions[modelIn].getText()
//    await modelOptions[modelIn].click()
//    await driver.sleep(500)

//    const trimDropDown = await driver.wait(
//       until.elementLocated(By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Trim')]")),
//       10000
//    )
//    await trimDropDown.click()
//    await driver.sleep(500)
//    const trimOptions = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))
//    await driver.sleep(500)
//    currTrimText = await trimOptions[trimIn].getText()
//    await trimOptions[trimIn].click()
//    await driver.sleep(500)

//    //    const sizeDropDown = await driver.wait(
//    //       until.elementLocated(By.xpath("//span[contains(@class, 'telerik-blazor') and contains(., 'Select Size')]")),
//    //       10000
//    //    )
//    await sizeDropDown.click()
//    await driver.sleep(500)
//    const sizeOptions = await driver.findElements(By.xpath("//ul[@role='listbox']//li[@role='option']"))
//    await driver.sleep(500)
//    currSizeText = await sizeOptions[sizeIn].getText()
//    await sizeOptions[sizeIn].click()
//    await driver.sleep(500)

//    const searchBtn = await driver.findElement(By.id('btnTireSearch'))
//    await searchBtn.click()
// }

async function scrapeGBB(driver) {
   //await driver.sleep(5000)
   const gbb = {
      good: {},
      better: {},
      best: {},
   }

   const fullSetOfTireData = []

   let tireDataGrid
   try {
      tireDataGrid = await driver.wait(until.elementLocated(By.id('gridCards')), 7000)
      //console.log('found the grid')
   } catch (error) {
      return
   }

   const tireCells = await tireDataGrid.findElements(By.css('.relative.w-full.block'))
   //console.log(tireCells.length)

   for (let i = 0; i < tireCells.length; i++) {
      const cell = tireCells[i]

      const cellData = await getCellData(cell)

      fullSetOfTireData.push(cellData)

      if (i < 3) {
         const pTags = await cell.findElements(By.css('p'))
         for (const pTag of pTags) {
            const text = await pTag.getText()
            const trimmed = text.trim()

            if (trimmed === 'PREFERRED') {
               console.log(`Found PREFERRED at index ${i}`)
               try {
                  gbb.best = await getCellData(cell)
               } catch (err) {
                  console.log('Could not scrape cell data:', err.message)
               }
               break
            }

            if (trimmed === 'CHOICE') {
               console.log(`Found CHOICE at index ${i}`)
               try {
                  gbb.better = await getCellData(cell)
               } catch (err) {
                  console.log('Could not scrape cell data:', err.message)
               }
               break
            }

            if (trimmed === 'VALUE') {
               console.log(`Found VALUE at index ${i}`)
               try {
                  gbb.good = await getCellData(cell)
               } catch (err) {
                  console.log('Could not scrape cell data:', err.message)
               }
               break
            }
         }
      }
   }

   return { gbb: gbb, fullSetOfTireData: fullSetOfTireData }
}

async function getCellData(cell) {
   const imgHolder = await cell.findElement(
      By.xpath(".//div[contains(@class, 'cursor-pointer') and contains(@class, 'flex-col')]")
   )

   //console.log('grabbed the image holder')
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

   const retialPriceTextMatch = retialPriceText.match(/[\d.]+/)
   const retialPriceNumber = retialPriceTextMatch ? parseFloat(retialPriceTextMatch[0]) : 0.0
   const installedPriceTextMatch = installedPriceText.match(/[\d.]+/)
   const installedPriceNumber = installedPriceTextMatch ? parseFloat(installedPriceTextMatch[0]) : 0.0

   return {
      brand: imgAlt,
      size: tireSize,
      title: tireTitle,
      retailPrice: retialPriceNumber,
      installedPrice: installedPriceNumber,
   }
}

async function scrapeGBBTemp(driver) {
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

async function usafScrapeGBB() {
   const startTime = Date.now()
   console.log('running function')
   const args = process.argv.slice(2) // Skip 'node' and script name

   const yearArg = args[0]
   const makeArg = args[1]
   const modelArg = args[2]
   const trimArg = args[3]
   const sizeArg = args[4]

   console.log(`${yearArg} ${makeArg} ${modelArg} ${trimArg} ${sizeArg}`)

   const { good, better, best } = await getGBB(yearArg, makeArg, modelArg, trimArg, sizeArg)

   const endTime = Date.now()
   const executionTime = endTime - startTime
   console.log('Scraping completed!')
   console.log(`Total Execution Time: ${executionTime / 1000} seconds`)
}

usafScrapeGBB()

// // Wait for the options to load
// await driver.wait(until.elementsLocated(By.xpath("//ul[@role='listbox']//li[@role='option']")), 5000)

// const html = await driver.getPageSource()
// await fs.writeFile('after-dropdown.html', html)
