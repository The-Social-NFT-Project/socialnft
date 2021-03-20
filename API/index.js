
exports.tiktokMint = async (req, res) => {

 const Web3 = require('web3');
 const web3 = new Web3(" <rpc url> "); 
 const fs = require('fs'); 
 const TikTokScraper = require('tiktok-scraper');
 const fleekStorage = require('@fleekhq/fleek-storage-js');
 const { default: Resolution } = require('@unstoppabledomains/resolution');
 const resolution = new Resolution();

 var text;
 var name;
 var username;
 var id;
 var videourl;
 var user;
 var caption;
 var hashtags;
 var attributes = [];

 var options = {
    sessionList: [' <tiktok cookie> ']
 }

 const videoMeta = await TikTokScraper.getVideoMeta(req.query.url, options);

 caption = videoMeta.collector[0].text;
 text = videoMeta.collector[0].authorMeta.signature;
 id = videoMeta.collector[0].id;
 name = videoMeta.collector[0].authorMeta.nickName;
 username = videoMeta.collector[0].authorMeta.name;
 videourl = videoMeta.collector[0].videoUrl;
 hashtags = videoMeta.collector[0].hashtags;

 attributes.push({
      "trait_type": "Username", 
      "value": ""+username+""
    })

 hashtags.forEach(element => attributes.push({
      "trait_type": "Hashtag", 
      "value": "#"+element.name+""
    }));   
 
 var bio = text.toLowerCase();
 var userx = bio.match(/0x[a-fA-F0-9]{40}/);
 var usery = bio.match(/(?:[\w-]+\.)+(?:crypto|eth|xyz|luxe|kred)/);

 function resolve(domain, currency) {
  resolution
    .addr(domain, currency)
    .then((address) => {
     user = address;
 });
 }

 if(usery){
 resolve(''+usery[0]+'', 'ETH');
 }

 else if(userx){
 user = userx[0];
 }

 else{
 return res.send("Ethereum address missing from bio");
 }

 options = {
    headers:{
    "user-agent":videoMeta.headers["user-agent"],
    "referer":videoMeta.headers.referer,
    "cookie":videoMeta.headers.cookie
    }
}

const fetch = require('node-fetch');

async function download() {
  const response = await fetch(videourl, options);
  const buffer = await response.buffer();
  fs.writeFile('/tmp/'+id+'.mp4', buffer, () => 
    console.log('finished downloading!'));

    fs.readFile('/tmp/'+id+'.mp4', async (error, fileData) => {
    const uploadedFile = await fleekStorage.upload({
    apiKey: ' <API KEY> ',
    apiSecret: ' <API SECRET> ',
    key: ''+id+'.mp4',
    data: fileData,
  });
  
  let metadata = { 
    description: caption,
    external_url: req.query.url, 
    name: ''+name+' (@'+username+') on TikTok',
    image: "ipfs://"+uploadedFile.hash+"",
    attributes: attributes
};
 
let data = JSON.stringify(metadata, null, 2);
fs.writeFileSync('/tmp/metadata.json', data);

fs.readFile('/tmp/metadata.json', async (error, fileData) => {
    const uploadedMetadata = await fleekStorage.upload({
    apiKey: ' <API KEY> ',
    apiSecret: ' <API SECRET> ',
    key: ''+id+'.json',
    data: fileData,
  });

  const privateKey = ' <PRIV KEY> ';
  const account = web3.eth.accounts.wallet.add(`0x${privateKey}`);
  web3.eth.defaultAccount = account.address;

  const abi = <CONTRACT ABI>;
  const contract_Address = " <CONTRACT ADDRESS> ";
  
  const myContract = new web3.eth.Contract(abi, contract_Address, {
    from: ' <FROM ADDRESS> ', // default from address
    })

  myContract.methods.mintItem(user,"ipfs://"+uploadedMetadata.hash+"",id).send({gas: 8000000})
  .then(function(receipt){

  var hash = receipt.events.Transfer.transactionHash;
  return res.send({"explorer":"https://explorer-mainnet.maticvigil.com/tokens/<CONTRACT ADDRESS>/instance/"+id+"", "opensea":"https://opensea.io/assets/matic/<CONTRACT ADDRESS>/"+id+""});

  });

  })
  

}) 
}

download();
};

