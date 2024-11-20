const ffmpegService = require('./streaming/FFmpegService');
const storageService = require('./streaming/StorageService');
const Channel = require('../models/Channel');

class ChannelService {
    constructor() {
        this.channels = [new Channel('DEFAULT_CHANNEL', process.env.DEFAULT_CHANNEL_URL, "https://images.unsplash.com/photo-1534308143481-c55f00be8bd7?w=64&h=64&fit=crop&crop=faces")];
        this.currentChannel = this.channels[0];
    }

    getChannels() {
        return this.channels;
    }

    addChannel(name, url, avatar) {
        const existing = this.channels.some(channel => channel.url === url);
        if (existing) {
            throw new Error('Channel already exists');
        }
        const newChannel = new Channel(name, url, avatar);
        this.channels.push(newChannel);
        
        return newChannel;
    }

    setCurrentChannel(id) {
        const nextChannel = this.channels.find(channel => channel.id === id);
        if (!nextChannel) {
            throw new Error('Channel does not exist');
        }
        if (this.currentChannel !== nextChannel) {
            const segmentNumber = storageService.getNextSegmentNumber();
            storageService.clearStorage();
            this.currentChannel = nextChannel;
            ffmpegService.startFFmpeg(nextChannel.url, segmentNumber);
        }
        return nextChannel;
    }

    getCurrentChannel() {
        return this.currentChannel;
    }
}

module.exports = new ChannelService();
