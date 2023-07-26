import * as httpsModule from 'https';
import { AppInsightsCore, IExtendedConfiguration } from '@microsoft/1ds-core-js';
import { PostChannel, IChannelConfiguration, IPayloadData, IXHROverride } from '@microsoft/1ds-post-js';


const testEvent = {
  name: 'Test event',
  properties: {
    testProperty: 'Test property value'
  }
};
const endpointUrl = 'https://mobile.events.data.microsoft.com/OneCollector/1.0';

const customHttpXHROverride: IXHROverride = {
  sendPOST: (payload: IPayloadData, oncomplete) => {

    const telemetryRequestData = typeof payload.data === 'string' ? payload.data : new TextDecoder().decode(payload.data);
    const requestOptions = {
      type: 'POST',
      headers: {
        ...payload.headers,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload.data).toString()
      },
      url: payload.urlString,
      data: telemetryRequestData
    };

    try {
      // Commenting/removing since we're not using IRequestOptions from vs request library
      // if (requestService) {
      //   makeTelemetryRequest(requestOptions, requestService).then(({ statusCode, headers, responseData }) => {
      //     oncomplete(statusCode, headers, responseData);
      //   });
      // } else {
        if (!httpsModule) {
          throw new Error('https module is undefined');
        }
        makeLegacyTelemetryRequest(requestOptions, httpsModule);
      // 
    } catch {
      // If it errors out, send status of 0 and a blank response to oncomplete so we can retry events
      oncomplete(0, {});
    }
  }
};


/** ///PULLED FROM VSCODE REPO///
 * Complete a request to submit telemetry to the server utilizing the https module. Only used when the request service is not available
 * @param options The options which will be used to make the request
 * @param httpsModule The https node module
 * @returns An object containing the headers, statusCode, and responseData
 */
function makeLegacyTelemetryRequest(options: {type: string, headers:{}, url: string, data: {}}, httpsModule: typeof import('https')) {
	const httpsOptions = {
		method: options.type,
		headers: options.headers
	};
	const req = httpsModule.request(options.url ?? '', httpsOptions, res => {
    //Need to add error handling here
		res.on('data', function (responseData) {
			return {
				headers: res.headers as Record<string, any>,
				statusCode: res.statusCode ?? 200,
				responseData: responseData.toString()
			};
		});
		// On response with error send status of 0 and a blank response to oncomplete so we can retry events
		res.on('error', function (err) {
			throw err;
		});
	});
	req.write(options.data);
	req.end();
	return;
}

export class App {
  public express
  public appInsightsCore: AppInsightsCore
  constructor () {

    this.appInsightsCore = new AppInsightsCore();
    var postChannel: PostChannel = new PostChannel();

    //Configure App insights core to send to collector
    var coreConfig: IExtendedConfiguration = {
      instrumentationKey: "123",
      endpointUrl,
      extensions: [
        postChannel
      ],
      extensionConfig: {},
    };

    if (customHttpXHROverride) {
      coreConfig.extensionConfig = {};
      // Configure the channel to use a XHR Request override since it's not available in node
      const channelConfig: IChannelConfiguration = {
        alwaysUseXhrOverride: true,
        httpXHROverride: customHttpXHROverride
      };
      coreConfig.extensionConfig[postChannel.identifier] = channelConfig;
    }
  

    var postChannelConfig: IChannelConfiguration = {
        eventsLimitInMem: 5000
    };
    coreConfig.extensionConfig[postChannel.identifier] = postChannelConfig;
    //Initialize SDK
    this.appInsightsCore.initialize(coreConfig, []);
    this.appInsightsCore.track(testEvent);
  }

  public post():void {
    this.appInsightsCore.track(testEvent);
    console.log("working")
  }

}

export default new App().express