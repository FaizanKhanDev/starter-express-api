/* eslint-disable import/extensions */
const multer = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');
const probe = require('probe-image-size');
const Ads = require('../models/ads.model');
const Messages = require('../config/messages.js');

aws.config.update({
  secretAccessKey: process.env.AWS_ACCESS_KEY,
  accessKeyId: process.env.AWS_ACCESS_ID,
  region: process.env.AWS_REGION,
});

const s3 = new aws.S3();
const s3Bucket = new aws.S3({ params: { Bucket: process.env.AWS_BUCKET } });
const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET,
    acl: 'public-read',
    key(req, file, cb) {
      console.log('uploading files');
      console.log(file);
      console.log('======================');
      cb(null, Date.now() + file.originalname); // use Date.now() for unique file keys
    },
  }),
}).any();

function uploadVideoThumb(video_thumb, key) {
  return new Promise((resolve, reject) => {
    if (video_thumb === null || video_thumb === '') {
      resolve(null);
      return;
    }

    const buf = Buffer.from(video_thumb.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const data = {
      Key: key,
      Body: buf,
      ACL: 'public-read',
      ContentEncoding: 'base64',
      ContentType: 'image/png',
    };

    s3Bucket.upload(data, (err, response) => {
      if (err) {
        reject(err);
      } else {
        resolve(response.Location);
      }
    });
  });
}

/// //////////////////////////////////////////////////////////////////////
/// ///////////////////////// Add Ads ////////////////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function add(req, res) {
  upload(req, res, async (err) => {
    const { title, link, mediaType, thumbnail } = req.body;
    const mediaSrc = req.files.length ? req.files[0].location : '';

    if (err) {
      res.json({
        result: false,
        error: Messages.INVALID_MEDIA_FORMAT,
      });
    } else {
      // Video Ads.
      if (mediaType === 'Video') {
        const key = title + '_videothumb.png';
        uploadVideoThumb(thumbnail, key).then(async (thumb_url) => {
          if (thumb_url) {
            const thumbnailSize = await probe(thumb_url);
            const ads = await Ads.findOne({ title });
            if (ads) {
              res.json({
                result: false,
                error: Messages.ADS_EXISTING,
              });
            } else {
              const item = Ads();
              item.title = title;
              item.link = link;
              item.mediaType = mediaType;
              item.mediaSrc = mediaSrc;
              item.thumbnail = thumb_url;
              item.thumbnailSize = thumbnailSize;
              item.createdAt = Date.now();

              await item.save();
              res.json({
                result: true,
                ads: item,
              });
            }
          } else {
            res.json({
              result: true,
              error: Messages.THUMBNAIL_ERROR,
            });
          }
        });
      }
    }
  });
}

/// //////////////////////////////////////////////////////////////////////
/// ///////////////////////// Edit Ads ///////////////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function edit(req, res) {
  upload(req, res, async (err) => {
    const { id, title, link, mediaType } = req.body;
    const mediaSrc = req.files.length ? req.files[0].location : '';

    if (err) {
      res.json({
        result: false,
        error: Messages.INVALID_MEDIA_FORMAT,
      });
    } else {
      if (mediaSrc === '') {
        const ads = await Ads.findById(id);
        if (ads) {
          ads.title = title;
          ads.link = link;
          ads.createdAt = Date.now();

          await ads.save();
          res.json({
            result: true,
            ads,
          });
        }
      } else {
        // Video.
        if (mediaType === 'Video') {
          const thumbnail = req.body.thumbnail;
          const key = title + '_videothumb.png';
          uploadVideoThumb(thumbnail, key).then(async (thumb_url) => {
            if (thumb_url) {
              const ads = await Ads.findById(id);
              const thumbnailSize = await probe(thumb_url);
              if (ads) {
                ads.title = title;
                ads.link = link;
                ads.mediaType = mediaType;
                ads.mediaSrc = mediaSrc;
                ads.thumbnail = thumb_url;
                ads.thumbnailSize = thumbnailSize;
                ads.totalShows = 0;
                ads.totalClicks = 0;
                ads.createdAt = Date.now();

                await ads.save();
                res.json({
                  result: true,
                  ads,
                });
              } else {
                res.json({
                  result: false,
                  error: Messages.ADS_NOT_EXISTING,
                });
              }
            } else {
              const ads = await Ads.findById(id);
              if (ads) {
                ads.title = title;
                ads.link = link;
                ads.mediaType = mediaType;
                ads.mediaSrc = mediaSrc;
                ads.totalShows = 0;
                ads.totalClicks = 0;
                ads.createdAt = Date.now();
                await ads.save();
                res.json({
                  result: true,
                  ads,
                });
              }
            }
          });
        }
      }
    }
  });
}

/// //////////////////////////////////////////////////////////////////////
/// //////////////////////// Remove Ads //////////////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function remove(req, res) {
  const { id } = req.body;
  await Ads.deleteOne({ _id: id });
  res.json({
    result: true,
    message: Messages.ADS_REMOVED,
  });
}

/// //////////////////////////////////////////////////////////////////////
/// //////////////////////// Get All Ads /////////////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function getAll(req, res) {
  const ads = await Ads.find({}, null, { sort: { createdAt: 'desc' } });
  res.json({
    result: true,
    ads,
  });
}

/// //////////////////////////////////////////////////////////////////////
/// ////////////////////////// Check Ads /////////////////////////////////
/// //////////////////////////////////////////////////////////////////////
async function checkAds(req, res) {
  const { id, type } = req.body;
  const ads = await Ads.findById(id);
  if (ads) {
    if (type === 'show') {
      ads.totalShows++;
    } else if (type === 'click') {
      ads.totalClicks++;
    }
    await ads.save();
    res.json({
      result: true,
      ads,
    });
  } else {
    res.json({
      result: false,
      error: Messages.ADS_NOT_EXISTING,
    });
  }
}

module.exports = {
  add,
  edit,
  remove,
  getAll,
  checkAds,
};
