import { Builder, By, until } from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome.js'
import fs from 'fs'
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

const progressBars = new cliProgress.MultiBar(
   {
      format: 'Bot {botId} | {bar} {percentage}% | {value}/{total} models',
      hideCursor: true,
      clearOnComplete: false,
   },
   cliProgress.Presets.shades_grey
)

async function scrapOneBrand(botId, makeIn, yearIn, modelIn, sizeIn, tireIn, yearsToScrapeArray) {
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

   await driver.manage().window().setRect({ x: -1090, y: 0, width: 1100, height: 1920 })
   // await driver.manage().window().setRect({ x: 0, y: 0, width: 1080, height: 1920 })
   let restartNeeded = false

   // Periodic restart logic
   const intervalID = setInterval(() => {
      console.log('interval restart hit for bot')
      restartNeeded = true
   }, 600000) // Every 30 mins 1800000 600000 === 10 mins

   let makeIndex = makeIn
   let yearIndex = yearIn
   let modelIndex = modelIn
   let sizeIndex = sizeIn
   let tireIndex = tireIn

   try {
      // ✅ Navigate to the correct page
      await driver.get('https://www.claydooley.com/shop-for-tires/')
      await driver.sleep(10000) // 🛑 Pause to observe the page load

      // ✅ Wait for the dropdown to appear
      await driver.wait(until.elementLocated(By.id('ddlMake')), 1000)
      let makeOptions = await getDropdownOptions(driver, 'ddlMake')
      const make = makeOptions[makeIndex].text

      await selectDropdown(driver, 'ddlMake', make)

      // ✅ Ensure Year dropdown updates
      await driver.wait(until.elementLocated(By.id('ddlYears')), 1000)
      let yearOptions = await getDropdownOptions(driver, 'ddlYears')

      //progressBar.start(yearOptions.length, 0) // Start the progress bar

      for (let i = yearIndex; i < yearOptions.length; i++) {
         const year = yearOptions[i].text
         if (yearsToScrapeArray.includes(year)) {
            console.log(`\n\nBOT ${botId} starting year: ${year} index: ${makeIndex}`)
            const totalBotYears = yearsToScrapeArray.length
            const finishedBotYears = yearsToScrapeArray.indexOf(year)

            await selectDropdown(driver, 'ddlYears', year)

            // ✅ Ensure Model dropdown updates
            await driver.wait(until.elementLocated(By.id('ddlModels')), 1000)
            let modelOptions = await getDropdownOptions(driver, 'ddlModels')

            for (let i = modelIndex; i < modelOptions.length; i++) {
               const model = modelOptions[i].text
               await selectDropdown(driver, 'ddlModels', model)

               // ✅ Ensure Options dropdown updates
               await driver.wait(until.elementLocated(By.id('ddlOptions')), 1000)
               let sizeOptions = await getDropdownOptions(driver, 'ddlOptions')
               let skipBackToSearch = false

               for (let i = sizeIndex; i < sizeOptions.length; i++) {
                  const size = sizeOptions[i].text
                  await selectDropdown(driver, 'ddlOptions', size)

                  // ✅ Click the search button
                  let findMyTiresBtn = await driver.findElement(By.id('btnSearch'))
                  //console.log('slowClicking FIND MY TIRES BTN')
                  await slowClick(findMyTiresBtn, driver, 1000)

                  // ✅ Check and click dealer button if it appears
                  let dealerClicked = await checkAndClickDealerButton(driver)
                  if (dealerClicked) {
                     await driver.sleep(3000)
                  }

                  let tireElements = []

                  try {
                     // Wait up to 10 seconds for at least one element to be present
                     await driver.wait(
                        until.elementLocated(By.xpath("//*[contains(@id, 'additionalTire')]")),
                        20000 // 10 seconds
                     )

                     // Once located, retrieve all matching elements
                     tireElements = await driver.findElements(By.xpath("//*[contains(@id, 'additionalTire')]"))
                  } catch (err) {
                     console.error('Elements not found within 20 seconds')
                  }

                  if (tireElements.length === 0) {
                     const tireData = {
                        make: make,
                        year: year,
                        model: model,
                        size: size,
                        tireTitle: 'None Found',
                        tireBrand: 'None Found',
                        basePrice: 'None Found',
                        installPrice: 'None Found',
                        quote: 'None Found',
                        features: 'None Found',
                        benefits: 'None Found',
                        specs: 'None Found',
                     }

                     await appendJsonToFile(tireData)

                     let modalCloseBtn = await driver.findElement(By.css('.close-btn.pull-right.blue'))

                     // console.log(
                     //    `HERE: Bot ${botId} at indecis: MAKE -> ${makeIndex} YEAR -> ${year} MODEL -> ${model} SIZE -> ${size} TIRE -> ${tireIndex} `
                     // )
                     // console.log('slowClicking MODAL CLOSE BTN')

                     await slowClick(modalCloseBtn, driver)

                     skipBackToSearch = true
                  } else {
                     for (let i = tireIndex; i < tireElements.length; i++) {
                        let updatedTireElements = await driver.findElements(
                           By.xpath("//*[contains(@id, 'additionalTire')]")
                        )
                        //  try {
                        let tireLink = await updatedTireElements[i].findElement(By.xpath('.//div/div[5]/div[2]/div/a'))
                        //console.log('slowClicking TIRE LINK')

                        await slowClick(tireLink, driver) // Click that causes navigation

                        let [tireBrand, tireTitle, priceData, featuresList, benefitsList, specsList] =
                           await Promise.all([
                              getBrandSrc(driver),
                              getTireTitle(driver),
                              getPricingData(driver),
                              getFeaturesList(driver),
                              getBenefitsList(driver),
                              getSpecData(driver),
                           ])

                        currentTireTitle = tireTitle

                        const tireData = {
                           make: make,
                           year: year,
                           model: model,
                           size: size,
                           tireTitle: tireTitle,
                           tireBrand: tireBrand,
                           basePrice: priceData.displayPrice,
                           installPrice: priceData.installTotal,
                           quote: priceData.quote,
                           features: featuresList,
                           benefits: benefitsList,
                           specs: specsList,
                        }

                        await appendJsonToFile(tireData)

                        tireIndex += 1
                        totalNumItems += 1

                        let returnButton = await driver.wait(
                           until.elementLocated(By.xpath("//a[contains(text(), 'Return To Search Results')]")),
                           5000
                        )

                        //console.log('slowClicking RETURN BTN')

                        await slowClick(returnButton, driver)
                     }
                  }
                  tireIndex = 0
                  sizeIndex += 1
                  //currentPathTotal += 1

                  // const endTime = Date.now()
                  // const executionTime = endTime - startTime
                  // //console.log(`\n\nBOT ${botId} starting year: ${year}`)
                  // console.log(`\n\nBOT ${botId} Progress: ${Math.floor((currentPathTotal / totalBotPaths) * 100)}%`)
                  // console.log(`Execution Time: ${(executionTime / 1000 / 60 / 60).toFixed(2)}\n\n`)

                  // break from the entire function here
                  if (restartNeeded === true) {
                     //progressBar.stop() // Stop progress bar when bot completes
                     clearInterval(intervalID)
                     await driver.quit()
                     console.log(
                        `Restarting hit for Bot ${botId} at indecis: MAKE -> ${make} YEAR -> ${year} MODEL -> ${model} SIZE -> ${size} TIRE -> ${tireIndex}`
                     )
                     return Promise.reject({
                        botId: botId,
                        reason: `restarting ${botId}`,
                        indecies: [makeIndex, yearIndex, modelIndex, sizeIndex, tireIndex],
                     })
                  }

                  // ✅ Navigate back for the next iteration --> THIS WORKS!!
                  if (!skipBackToSearch) {
                     // this is needed because await slowClick(modalCloseBtn, driver)
                     let backToSearchBtn = await driver.findElement(By.id('searchBackLink'))
                     //console.log('slowClicking BACK TO SEARCH BTN')

                     await slowClick(backToSearchBtn, driver)
                  }
                  skipBackToSearch = false
               }
               sizeIndex = 0
               modelIndex += 1

               // progressBarModelProg = (i / modelOptions.length) * progressBarModelProgTotal
               // progressBarModelProgTotal = modelOptions.length * yearsToScrapeArray.length

               // const totalEqualsSigns = Math.floor((progressBarModelProg / progressBarModelProgTotal) * 100)
               // const totalSpaces = 100 - totalEqualsSigns
               // console.log(progressBarModelProg)
               // console.log(progressBarModelProgTotal)
               // console.log(totalEqualsSigns)
               // console.log(totalSpaces)
               // let progressbarStr = '<' + '='.repeat(totalEqualsSigns) + ' '.repeat(totalSpaces) + '>'
               // console.log(`Bot ${botId} ${progressbarStr}`)
            }
         }

         modelIndex = 0
         yearIndex += 1

         //progressBar.increment() // Update progress bar
      }

      //progressBar.stop() // Stop progress bar when bot completes
      clearInterval(intervalID)
      await driver.quit()

      console.log(
         `Finished Bot ${botId} at indecis: MAKE -> ${make} YEAR -> ${yearIndex} MODEL -> ${modelIndex} SIZE -> ${sizeIndex} TIRE -> ${tireIndex} `
      )

      return Promise.resolve({
         botId: botId,
         reason: `complete`,
         indecies: [makeIndex, yearIndex, modelIndex, sizeIndex, tireIndex],
      })
   } catch (err) {
      console.log(`BOT ${botId} ENCOUNTERED AN ERROR`)
      console.log('SOMETHING WENT WRONG: ', err)

      const tireData = {
         error: 'Something went wrong',
         currentTireTitle: currentTireTitle,
         makeIndex: makeIndex,
         yearIndex: yearIndex,
         modelIndex: modelIndex,
         sizeIndex: sizeIndex,
         tireIndex: tireIndex,
      }

      await appendJsonToFile(tireData)
      //progressBar.stop() // Stop progress bar when bot completes
      clearInterval(intervalID)
      await driver.quit()

      console.log(
         `Something went wrong for Bot ${botId} at indecis: MAKE -> ${makeIndex} YEAR -> ${yearIndex} MODEL -> ${modelIndex} SIZE -> ${sizeIndex} TIRE -> ${tireIndex} `
      )

      return Promise.reject({
         botId: botId,
         reason: err,
         indecies: [makeIndex, yearIndex, modelIndex, sizeIndex, tireIndex],
      })
   }
}

// function splitArrayIntoFour(arr) {
//    let chunkSize = Math.floor(arr.length / 4) // Base chunk size
//    let remainder = arr.length % 4 // Extra elements to distribute

//    let bot1YearArray = arr.slice(0, chunkSize + (remainder > 0 ? 1 : 0))
//    let bot2YearArray = arr.slice(bot1YearArray.length, bot1YearArray.length + chunkSize + (remainder > 1 ? 1 : 0))
//    let bot3YearArray = arr.slice(
//       bot1YearArray.length + bot2YearArray.length,
//       bot1YearArray.length + bot2YearArray.length + chunkSize + (remainder > 2 ? 1 : 0)
//    )
//    let bot4YearArray = arr.slice(bot1YearArray.length + bot2YearArray.length + bot3YearArray.length) // Remaining elements

//    return { bot1YearArray, bot2YearArray, bot3YearArray, bot4YearArray }
// }

function splitArrayIntoChunks(arr, x) {
   let chunkSize = Math.floor(arr.length / x) // Base chunk size
   let remainder = arr.length % x // Extra elements to distribute
   let result = []
   let startIndex = 0

   for (let i = 0; i < x; i++) {
      let extra = remainder > 0 ? 1 : 0 // Distribute remainder elements
      let endIndex = startIndex + chunkSize + extra
      result.push(arr.slice(startIndex, endIndex))
      startIndex = endIndex
      remainder--
   }

   return result
}

function buildArrayChunks(arr, numChunks) {
   const arrayChunks = Array.from({ length: numChunks }, () => [])
   for (let index = 0; index < arr.length; index++) {
      const element = arr[index]
      arrayChunks[index % numChunks].push(element)
   }
   return arrayChunks
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

   let brandStart = 0 // Toyota
   const maxConcurrentBots = 1 // Maximum bots running at the same time
   const totalRuns = 1 // 88 Total number of bots that should run 88
   let completedRuns = 0 // Keep track of finished bots

   while (completedRuns < totalRuns) {
      console.log('starting while')
      const makeStartTime = Date.now()
      let yearArray = await getMakeYears(brandStart)
      console.log(yearArray)
      // const totalPathsArray = await getTotalPaths(brandStart)
      // console.log(totalPathsArray)
      const setupEndTime = Date.now()
      const setupExecTime = setupEndTime - makeStartTime
      console.log(`Setup ${carBrands[brandStart]} Execution Time: ${setupExecTime / 1000 / 60} mins`)
      await clearBrowserTasks()
      await setTimeout(3000)

      let runningBots = [] // Track running bot promises

      const botsArray = buildArrayChunks(yearArray, maxConcurrentBots) // splitArrayIntoChunks(yearArray, maxConcurrentBots)
      //const botsTotalPathsYearArray = buildArrayChunks(totalPathsArray, maxConcurrentBots)
      let botsProgress = botsArray.map(() => {
         return 'running'
      })
      const resetBotProgress = botsProgress

      console.log(botsArray)
      console.log('car brands count: ', carBrands.length)
      //console.log('botsTotalPathsYearArray: ', botsTotalPathsYearArray)

      while (botsProgress.includes('running')) {
         // Start new bots if there's capacity and we haven't reached the limit
         while (runningBots.length < maxConcurrentBots) {
            let botId = runningBots.length // + 1 for testing purposes
            let botPromise = runBot(botId, botsArray[botId], brandStart, 0, 0, 0, 0).catch((error) => {
               console.log(`Bot ${botId} encountered an error:`, error)
               return error // Ensures it doesn’t break Promise.race
            })

            runningBots.push(botPromise)

            // botStartPoint += 1
         }

         // Wait for any one bot to finish before launching new ones
         const result = await Promise.race(runningBots)

         if (result.reason === 'complete') {
            console.log(`Completed Bot ${result.botId}`)
            botsProgress[result.botId] = 'complete'
            const neverResolvingPromise = new Promise(() => {})
            runningBots[result.botId] = neverResolvingPromise
         } else {
            console.log(
               `Restarting Bot ${result.botId} at indecis: MAKE -> ${result.indecies[0]} YEAR -> ${result.indecies[1]} MODEL -> ${result.indecies[2]} SIZE -> ${result.indecies[3]} TIRE -> ${result.indecies[4]} `
            )
            let botId = result.botId
            let botPromise = runBot(
               botId,
               botsArray[botId],
               result.indecies[0],
               result.indecies[1],
               result.indecies[2],
               result.indecies[3],
               result.indecies[4]
            )
            runningBots[botId] = botPromise
         }
      }
      console.log('finishing loop in while')
      const endTime = Date.now()
      const executionTime = endTime - makeStartTime
      console.log(`${carBrands[brandStart]} Execution Time: ${executionTime / 1000 / 60} mins`)
      runningBots = []
      botsProgress = resetBotProgress
      completedRuns += 1
      brandStart += 1
   }

   const endTime = Date.now()
   const executionTime = endTime - startTime
   console.log('Scraping completed!')
   console.log(`Total Execution Time: ${executionTime / 1000 / 60} mins`)
}

async function runBot(botId, yearsToScrape, makeIndex, yearIndex, modelIndex, sizeIndex, tireIndex) {
   try {
      const result = await scrapOneBrand(botId, makeIndex, yearIndex, modelIndex, sizeIndex, tireIndex, yearsToScrape)
      console.log(`Bot ${botId} finished!`)
      return {
         botId: result.botId,
         reason: 'complete',
         indecies: result.indecies,
      }
   } catch (err) {
      console.error(`Error in runBot Bot ${botId}:`, err)
      return {
         botId: err.botId,
         reason: err.reason,
         indecies: err.indecies,
      }
   }
}

parallelRun()
